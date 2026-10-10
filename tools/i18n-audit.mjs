#!/usr/bin/env node
// Spanish coverage audit of the public website (owner 2026-10-10: "make it more bilingual across the board with everything so that
// somebody who is bilingual does not miss out").
// Renders every public route in the real app in headless Chromium with the site switched to Spanish (?lang=es, the same switch the
// Español button uses), past the entry gate, and lists the text that is still English: text nodes plus the aria-label, title, alt and
// placeholder values the i18n.js pass translates, the document title and the meta description. Brand and character names, product
// SKUs, addresses and other proper nouns are allowed (ALLOW below). Investor pages are owner-only and out of scope.
//
// Usage: node tools/i18n-audit.mjs [--md tools/I18N_SITE_COVERAGE.md] [--json out.json] [--routes home,kids-shop] [--label before]
// Needs playwright-core (tests/a11y-harness.mjs). Sends nothing anywhere; reads only this folder.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadChromium, startSite, SITE } from '../tests/a11y-harness.mjs';

// ------------------------------------------------------------------ routes: every prerendered page plus the store flow and app doors
const EXTRA = [
  ['cart', null], ['checkout', null], ['store-request', null], ['sign-in', null], ['signin-family', null], ['signin-teacher', null],
  ['reset-password', null], ['not-found', null], ['this-week', null], ['shop-families', null]
];
// Deep pages with no address of their own: every activity card, every talk card and each friend's week.
function deep() {
  const out = [];
  const acts = readFileSync(join(SITE, 'family-library-data.js'), 'utf8').match(/\{\s*id: ?['"]([a-z0-9-]+)['"],\s*t: /g) || [];
  for (const a of acts) out.push(['activities', /['"]([a-z0-9-]+)['"]/.exec(a)[1]]);
  for (const m of readFileSync(join(SITE, 'talk-cards.js'), 'utf8').matchAll(/code: ?'(\d+)'/g)) out.push(['talk', m[1]]);
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) out.push(['this-week', k]);
  return out;
}
export function routes(opts = {}) {
  const m = JSON.parse(readFileSync(join(SITE, 'docs/seo-manifest.json'), 'utf8'));
  const out = m.pages.map(p => ({ route: p.route, arg: p.arg || null, file: p.file }));
  for (const [route, arg] of EXTRA.concat(deep())) out.push({ route, arg, file: '#' + route });
  if (opts.flows !== false) for (const f of FLOWS) out.push(Object.assign({ arg: null, file: 'flow' }, f));
  return out.filter(r => !/^investor/.test(r.route));
}
export const keyOf = r => r.flow ? 'flow:' + r.flow : r.route + (r.arg ? '/' + r.arg : '');

// ------------------------------------------------------------------ flows: states a visitor reaches by doing something
// The request forms as they look once the intake gateway is live (a scripted stand-in gateway answers; nothing leaves the machine),
// every form sent empty (its validation messages), a bag with an item, checkout, the search palette with results, and gateway refusals.
const submitAll = async page => {
  const ids = await page.evaluate(() => [...document.querySelectorAll('#view form')].map((f, i) => f.id || ('#' + i)));
  for (const id of ids) {
    await page.evaluate(id => {
      const f = id[0] === '#' ? document.querySelectorAll('#view form')[+id.slice(1)] : document.getElementById(id);
      if (!f) return;
      const b = f.querySelector('button[type="submit"],button:not([type])');
      if (b) b.click(); else if (f.requestSubmit) f.requestSubmit();
    }, id);
    await page.waitForTimeout(250);
  }
};
export const FLOWS = [
  ...['contact', 'enroll', 'quote', 'book-demo', 'store-request', 'jobs', 'for-families', 'bop-at-home', 'at-home'].map(r => ({ flow: 'forms/' + r, route: r, gateway: true, run: submitAll })),
  { flow: 'forms/contact-refused', route: 'contact', gateway: 'refuse', run: async page => {
    await page.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      set('cName', 'Ana Prueba'); set('cEmail', 'ana@example.org'); set('cMsg', 'Hola'); const f = document.getElementById('ffiContact'); if (f) f.querySelector('button[type="submit"]').click(); });
    await page.waitForTimeout(1200);
  } },
  { flow: 'store/bag-and-checkout', route: 'product', arg: 'booker-tshirt', run: async page => {
    await page.evaluate(() => { const b = document.querySelector('[data-sp-padd]'); if (b) b.click(); });
    await page.waitForTimeout(600);
    await page.evaluate(() => { const b = document.querySelector('[data-sp-open]'); if (b) { b.hidden = false; b.click(); } });
    await page.waitForTimeout(600);
  } },
  { flow: 'store/checkout-filled-bag', route: 'product', arg: 'booker-tshirt', run: async page => {
    await page.evaluate(() => { const b = document.querySelector('[data-sp-padd]'); if (b) b.click(); });
    await page.waitForTimeout(400);
    await page.evaluate(() => { location.hash = '#checkout'; });
    await page.waitForTimeout(900);
    await submitAll(page);
  } },
  // the phone back bar names the page you came from ("Back to Story Time"): reach pages by navigating, not by address
  ...[['story-time', 'story-time/booker-tries-again'], ['kids-shop', 'product/plush-bop'], ['habits', 'habit/wash-hands'], ['shop/kits', 'product/kit-home'], ['at-home', 'activities']]
    .map(([from, to]) => ({ flow: 'back/' + to, route: from, run: async page => { await page.evaluate(h => { location.hash = '#' + h; }, to); await page.waitForTimeout(900); } })),
  // every page of every Story Time book, turned one by one (the reader's own Next button)
  ...['booker-tries-again', 'big-feelings-brighter-days', 'what-happens-if-we-try', 'clean-up-team', 'the-rainbow-picnic'].map(id => ({ flow: 'book/' + id, route: 'story-time', arg: id, run: async (page, snap) => {
    for (let i = 0; i < 24; i++) {
      await snap();
      const more = await page.evaluate(() => { const b = document.querySelector('[data-fl="next"]:not([disabled])'); if (b) b.click(); return !!b; });
      if (!more) break;
      await page.waitForTimeout(250);
    }
  } })),
  { flow: 'search/bop', route: 'home', run: async page => {
    await page.evaluate(() => { if (window.FFWay && window.FFWay.palette) window.FFWay.palette.open(document.body); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { const q = document.getElementById('px-globalquery'); if (q) { q.value = 'Bop'; q.dispatchEvent(new Event('input', { bubbles: true })); } });
    await page.waitForTimeout(700);
  } }
];

// ------------------------------------------------------------------ what counts as English
// A string is English when it has at least one common English word and more English words than Spanish ones. Brand names, character
// names, product codes, emails, phone numbers, URLs and addresses are removed first.
export const ALLOW = [
  'Futures Friends', 'Futures Learning Center', 'Futures Hub', 'Futures Store', 'Futures Academy', 'Futures Include', 'Futures at Home',
  'Booker', 'Lumi', 'Zuri', 'Bop', 'Remy', 'Pip', 'Independence', 'Missouri', 'Kansas City', 'Blue Ridge Blvd', 'Head Start', 'CACFP',
  'GitHub', 'Google', 'Apple', 'YouTube', 'Instagram', 'Facebook', 'TikTok', 'Procare', 'Brightwheel', 'Lucide', 'PDF', 'Wi-Fi', 'Lexile',
  'Eat the Rainbow', 'Move Your Body, Grow Your Mind', 'Big Hearts, Bright Futures', 'Learn. Move. Explore. Belong.', 'Español', 'English', 'Español (borrador)',
  // titles of sources and documents, cited by name (they have no Spanish edition), and words printed on real products
  'Welcome Package & Catalog', 'Teacher Training & Certification', 'Futures Hub Platform Plan', 'Series Bible', 'Harvard Center on the Developing Child',
  'Brain Architecture', 'Caring for Our Children', 'CFOC', 'Creative Curriculum for Preschool', 'Teaching Strategies', 'Experience Early Learning',
  'Scholastic PreK On My Way', 'DESE Asynchronous Training Overview', 'University of Chicago', 'American Academy of Pediatrics', 'The Power of Play',
  'Every story starts with you', 'You belong here', 'Take a breath. You belong.', 'Who Likes to Party', 'Kevin MacLeod', 'CC BY 4.0', 'Zones Starter', 'Friend Fence',
  'Imagination Library', 'Do Not Track', 'Global Privacy Control', 'Family Care Safety Registry', 'Net Promoter Score', 'State Line', 'K.A.R.',
  'Reading Rockets', 'Frog Street Pre-K', 'Northcentral University', 'University of Phoenix', 'imaginationlibrary.com', 'futureslearningcenter.com', 'info@',
  // people and story-world cast (names are never translated)
  'Melissa Hill', 'Laurie Ouding', 'M.Ed.', 'Ms. June', 'Principal Hazel', 'Mr. Moss', 'Ms. Fern', 'Hazel', 'June', 'Moss', 'Fern', 'Rowan', 'Tilly', 'Rose',
  'Bruno', 'Sage', 'Ella', 'Mara', 'Nico', 'Poppy', 'Finn', 'Mimi', 'Tad'
];
const EN = new Set(('the and you your our for with to of in on is are be was were this that these those it its we us they them their what when where why how ' +
  'who which will can may must should would could do does did not no yes all any each every more most some many much one two three four five ' +
  'about after before from into out over under up down here there now then only also just very really here new see get got make made take ' +
  'have has had at by as or if but so than too back next first last open close shop order cart checkout add remove item items price free ' +
  'book books read story stories watch video videos play learn learning children child kids kid family families parent parents teacher ' +
  'teachers center centers program programs classroom room rooms home day days week weeks month time today tomorrow help support contact ' +
  'email phone name message send sign start view show hide more less menu search close back continue submit request quote pricing ' +
  'planned coming soon available sold size color quantity subtotal shipping tax note notes print download share copy link page ' +
  'pages friends friend kindness confidence curiosity courage tap enter sound without please thank thanks welcome hello join our sample ' +
  'draft approved review reviewed ages age years old year everyone each other together little big small brave bear bunny habit habits card ' +
  'cards songs feel feelings calm hands wash brush teeth shoes toys away turns gentle water break rest wiggle clean using use your ' +
  'yours mine my i\'m it\'s don\'t can\'t won\'t we\'re you\'re let\'s what\'s here\'s there\'s that\'s who\'s isn\'t aren\'t doesn\'t ' +
  'want need know like love find found keep try again ready set go done well good great best better poster posters plush tee tshirt ' +
  'hoodie backpack bottle sticker stickers carpet rug mat mats sign signs label labels bundle zone zones lesson lessons unit units ' +
  'training staff educators educator daycare daycares care license licensed partner partners membership members ' +
  'questions answers answer question faq news blog events jobs privacy terms accessibility policy cookies about').split(/\s+/));
const ES = new Set(('el la los las un una unos unas de del al y o que en con por para es son está están ser fue como más menos muy todo todos ' +
  'toda todas este esta estos estas ese esa eso lo le les se su sus tu tus mi mis nuestro nuestra nuestros nuestras sí no ya hay cada ' +
  'cuando donde qué cómo quién cuál porque pero si sin sobre entre hasta desde también solo aquí ahora hoy niños niño niña niñas familia ' +
  'familias maestra maestro maestros centro centros programa salón leer cuento cuentos ver video videos tienda pedido carrito precio ' +
  'gratis libro libros amigos amiga amigo bondad confianza curiosidad valentía casa semana día días mes juntos pequeño grande').split(/\s+/));
const strip = s => {
  let t = ' ' + s + ' ';
  for (const a of ALLOW) t = t.split(a).join(' ');
  return t.replace(/https?:\/\/\S+|\S+@\S+|\(?\d{3}\)?[ .-]?\d{3}-\d{4}|#[a-z0-9-]+|\b[A-Z0-9]{2,}(?:-[A-Z0-9]+)+\b|[\d$%.,:/×x+-]+/g, ' ');
};
export function isEnglish(s) {
  const words = strip(s).toLowerCase().match(/[a-záéíóúñü']+/g) || [];
  if (!words.length) return false;
  let en = 0, es = 0;
  for (const w of words) { if (EN.has(w)) en++; if (ES.has(w) || /[áéíóúñ¿¡]/.test(w)) es++; }
  return en >= 1 && en > es;
}

// ------------------------------------------------------------------ collect from one rendered page
function collect() {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT', 'svg', 'SVG', 'TEMPLATE']);
  const out = [];
  const skipped = el => {
    for (let e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (SKIP.has(e.tagName) || e.hasAttribute('data-i18n-skip') || e.getAttribute('translate') === 'no' || e.id === 'ff-lang-note') return true;
      if (e.hasAttribute('data-ff-lang')) return true;
      const l = e.getAttribute('lang'); if (l && e !== document.documentElement) return !/^en\b/i.test(l);
    }
    return false;
  };
  const vis = el => { try { const r = el.getClientRects(); return r.length > 0 && getComputedStyle(el).visibility !== 'hidden'; } catch (_) { return false; } };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === 3) {
      const t = n.data.replace(/\s+/g, ' ').trim();
      if (t && /[A-Za-z]/.test(t) && !skipped(n.parentNode)) out.push({ s: t, k: 'text', v: vis(n.parentNode), inView: !!n.parentNode.closest('#view') });
    } else {
      for (const a of ['aria-label', 'title', 'alt', 'placeholder']) {
        const v = n.getAttribute(a); if (!v) continue;
        const t = v.replace(/\s+/g, ' ').trim();
        if (t && /[A-Za-z]/.test(t) && !skipped(n)) out.push({ s: t, k: a, v: vis(n), inView: !!n.closest('#view') });
      }
    }
  }
  const md = document.querySelector('meta[name="description"]');
  out.push({ s: document.title, k: 'meta-title', v: true, inView: true });
  if (md && md.content) out.push({ s: md.content, k: 'meta-description', v: true, inView: true });
  return { items: out, lang: document.documentElement.lang };
}

// A string the English page also shows (same route, same state) that still has letters once names, numbers and codes are removed:
// it was not translated. This catches English the word list above cannot know (product names, single words, labels).
// Codes are not words: state and credential abbreviations (MO, RN, LNC), course codes (FF101, F-101), rule citations (5 CSR 25-500,
// RSMo 210.115) and clock times (9:30 AM).
export function hasWords(s) {
  const t = strip(s).replace(/\b(?:CSR|RSMo|K\.A\.R\.|AM|PM)\b/g, ' ').replace(/\b[A-Z]{1,4}\d*\b/g, ' ').replace(/\b[A-Z]-?\d+\b/g, ' ');
  return /[A-Za-z]{2,}/.test(t);
}

// opts.widths: viewports (default 1280 and 390: phones have their own bars and buttons). opts.compare (default true): also render
// each route in English at the first width and flag every Spanish-page string the English page shows too.
export async function audit(list, opts = {}) {
  const widths = opts.widths || [1280, 390];
  const compare = opts.compare !== false;
  const site = await startSite();
  const browser = await loadChromium().launch();
  const errors = [];
  const byKey = new Map();
  const enSets = new Map();
  let refuse = false;
  for (const w of widths) {
    const vp = { viewport: { width: w, height: w < 600 ? 844 : 900 }, reducedMotion: 'reduce', ...(w < 600 ? { isMobile: true, hasTouch: true } : {}) };
    const ctx = await browser.newContext(vp);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    // the stand-in gateway for the form flows (FF_INTAKE pinned to it; intake-config.js cannot overwrite it in that context)
    const gw = await browser.newContext(vp);
    await gw.addInitScript(() => { Object.defineProperty(window, 'FF_INTAKE', { configurable: false, get: () => ({ url: 'https://gw.invalid', turnstileSiteKey: '' }), set() {} }); });
    await gw.route('https://gw.invalid/**', route => {
      const u = route.request().url();
      const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (/form-token/.test(u)) return json(200, { token: '1.abc', minFillSeconds: 0.001 });
      if (/\/v1\/jobs/.test(u)) return json(200, { jobs: [] });
      if (refuse) return json(422, { error: 'invalid', errors: { name: 'enter your name', email: 'enter a valid email address', message: 'please remove the web links' } });
      return json(503, { error: 'unavailable' });
    });
    const gwPage = await gw.newPage();
    gwPage.on('pageerror', e => errors.push(e.message));
    let n = 0;
    const visit = async (r, pg, lang) => {
      const hash = '#' + r.route + (r.arg ? '/' + r.arg : '');
      await pg.goto(`${site.base}?nogate&nostamp&lang=${lang}&a=${++n}${hash}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await pg.waitForFunction(() => { const v = document.querySelector('#view'); return v && v.children.length > 0; }, null, { timeout: 20000 });
      if (r.route === 'support') await pg.evaluate(() => { try { st.help = 'faq'; render(); } catch (_) { /* no FAQ tab */ } });
      await pg.waitForTimeout(opts.wait || 700);
      const snaps = [];
      if (r.run) { await r.run(pg, async () => snaps.push(await pg.evaluate(collect))); await pg.waitForTimeout(300); }
      const d = await pg.evaluate(collect);
      for (const x of snaps) d.items.push(...x.items);
      if (r.flow) await pg.evaluate(() => { try { localStorage.removeItem('ff-store-cart-v1'); sessionStorage.clear(); sessionStorage.setItem('ff-entered', '1'); } catch (_) { /* blocked storage */ } });
      return d;
    };
    for (const r of list) {
      const key = keyOf(r);
      const pg = r.gateway ? gwPage : page;
      refuse = r.gateway === 'refuse';
      let out = byKey.get(key);
      if (!out) { out = { key, route: r.route, total: 0, english: [], lang: null, seen: new Set() }; byKey.set(key, out); }
      try {
        if (compare && w === widths[0]) {
          const en = await visit(r, pg, 'en');
          enSets.set(key, new Set(en.items.map(x => x.s)));
        }
        const d = await visit(r, pg, 'es');
        const enSet = enSets.get(key) || new Set();
        out.lang = out.lang || d.lang;
        if (d.lang !== 'es') out.lang = d.lang;
        for (const it of d.items) {
          const k = it.k + '|' + it.s;
          if (out.seen.has(k)) continue; out.seen.add(k);
          if (isEnglish(it.s) || (enSet.has(it.s) && hasWords(it.s))) out.english.push(Object.assign({ w }, it));
        }
        out.total = out.seen.size;
      } catch (e) {
        out.error = (out.error ? out.error + ' | ' : '') + w + ': ' + e.message.split('\n')[0];
      }
      if (opts.progress) process.stderr.write('.');
    }
    await gw.close(); await ctx.close();
  }
  await browser.close(); await site.close();
  if (opts.progress) process.stderr.write('\n');
  const res = [...byKey.values()].map(x => { delete x.seen; return x; });
  return { res, errors: [...new Set(errors)] };
}

// Areas for the report.
export function areaOf(route, key = '') {
  if (/^flow:forms/.test(key)) return 'Forms and messages';
  if (/^flow:store/.test(key)) return 'Store and shop';
  if (/^flow:search/.test(key)) return 'Header, search and footer';
  if (route === 'product' || /^(store|shop|cart|checkout|store-request|shop-programs|room-kit|kids-shop|shop-families)$/.test(route)) return 'Store and shop';
  if (/^(habit|habits)$/.test(route)) return 'Habit cards';
  if (/^(watch|family-videos|story-time|friends|talk)$/.test(route)) return 'Watch, videos and stories';
  if (/^(home|enroll|at-home|activities|printables|see-how|my-week|bop-at-home|this-week|whole-child|for-families|rainbow|family-guide)$/.test(route)) return 'Family pages';
  if (/^(contact|support|news|blog|post|events|jobs|privacy|child-privacy|terms|accessibility|not-found|sign-in|signin-family|signin-teacher|reset-password)$/.test(route)) return 'About, help, legal and sign-in';
  return 'Centers and programs';
}

// ------------------------------------------------------------------ the coverage report (tools/I18N_SITE_COVERAGE.md)
export function report(before, after, label) {
  const allow = new Set(JSON.parse(readFileSync(join(SITE, 'tools/i18n-allow.json'), 'utf8')).strings);
  const count = r => r ? r.english.filter(e => !allow.has(e.s)).length : null;
  const idx = list => new Map((list || []).map(r => [r.key, r]));
  const B = idx(before), A = idx(after);
  const keys = [...new Set([...A.keys(), ...B.keys()])];
  const areas = new Map();
  for (const k of keys) {
    const r = A.get(k) || B.get(k); const a = areaOf(r.route, k);
    if (!areas.has(a)) areas.set(a, { routes: 0, before: 0, after: 0, clean: 0 });
    const x = areas.get(a); x.routes++; x.before += count(B.get(k)) || 0; const n = count(A.get(k)) || 0; x.after += n; if (!n) x.clean++;
  }
  const L = [];
  L.push('# Spanish coverage of the public website', '');
  L.push(`Generated by \`node tools/i18n-audit.mjs --md tools/I18N_SITE_COVERAGE.md --before <before.json>\` (${new Date().toISOString().slice(0, 10)}, ${label}).`);
  L.push('Every route is rendered in headless Chromium in Spanish (?lang=es) at 1280 and 390 px, and in English at 1280 to compare. A string');
  L.push('counts as English left when it reads as English (common English words) or the English page shows the very same string and it still has');
  L.push('words once names, numbers and codes are removed. Text nodes, aria-label, title, alt, placeholder, the tab title and the meta description');
  L.push('are counted; brand and character names, cited source titles and tools/i18n-allow.json are not. Investor pages are owner-only and out of scope.');
  L.push('Flows (flow:...) are states a visitor reaches: request forms with the gateway live and sent empty, the bag, checkout and search.', '');
  L.push('All Spanish is a DRAFT pending review by the center\'s Spanish teacher (native speaker).', '');
  L.push('## How the Spanish site works', '');
  L.push('- **One switch, remembered.** The Español button (header, phone header, entry gate) or `?lang=es` turns the whole site Spanish; the choice is');
  L.push('  kept in this browser (localStorage `ff-lang`) on every page, including the prerendered addresses (/kids-shop, /habit-wash-hands ...).');
  L.push('- **Offered on first visit.** The entry gate has English · Español. A browser whose preferred language is Spanish also sees a one-line');
  L.push('  offer ("¿Prefieres español? Ver en español · No, gracias") until a language is chosen or the offer is declined.');
  L.push('- **Phrase tables.** `i18n-es.js` ... `i18n-es-8.js` (family pages, always loaded) and `i18n-es-site.js` (every other page, about 4,300 strings,');
  L.push('  downloaded only while Spanish is on, `?v=` = the build). Books, activities and captions have their own Spanish data files.');
  L.push('- **Tab title and meta description** follow the language (i18n.js `head()`), from the same tables.');
  L.push('- **Videos with voices** get the Spanish caption track as the default track while Spanish is on (captions.js, habits.js); every voiced');
  L.push('  clip has a `.es.vtt`. The Kids\' Shop film has music only.');
  L.push('- **Forms.** Labels, options, validation and gateway messages are translated. A request sent from the Spanish site adds');
  L.push('  "[Idioma preferido: español / Preferred language: Spanish]" to its message, so the center can answer in Spanish (only when it fits the');
  L.push('  gateway\'s message limit). Confirmation emails are written by the intake gateway in the CRM repo, not by this site: a "Ver en español"');
  L.push('  link there is an open item for that repo.');
  L.push('- **SEO on a hash app.** Every prerendered page names its Spanish address with `<link rel="alternate" hreflang="es" href=".../page?lang=es">`');
  L.push('  plus `hreflang="en"` and `x-default`, and `og:locale:alternate es_US`. The Spanish address renders Spanish (crawlers that run JavaScript');
  L.push('  see it) and names itself as canonical once rendered. Limits: the static HTML in each page is English (the Spanish is applied by');
  L.push('  JavaScript), so a crawler that does not run JavaScript sees English at the Spanish address; true Spanish static pages (/es/...) would');
  L.push('  need the prerender to run a second time in Spanish, which doubles the committed pages. The 404 page carries both languages.');
  L.push('- **Adding a string.** Add the English (exactly as on the page) and its Spanish to `i18n-es-site.js`, run this audit, and keep');
  L.push('  `tests/i18n-site.test.js` green. Anything that must stay English goes in `tools/i18n-allow.json` (names and titles only).', '');
  L.push('## By area', '', '| Area | Routes | English strings before | English strings after | Routes with none left |', '|---|---:|---:|---:|---:|');
  let tb = 0, ta = 0;
  for (const [a, x] of [...areas].sort()) { L.push(`| ${a} | ${x.routes} | ${before ? x.before : 'n/a'} | ${x.after} | ${x.clean} / ${x.routes} |`); tb += x.before; ta += x.after; }
  L.push(`| **All** | **${keys.length}** | **${before ? tb : 'n/a'}** | **${ta}** | |`, '');
  L.push('## By route', '', '| Route | Before | After | Left (first few) |', '|---|---:|---:|---|');
  for (const k of keys) {
    const a = A.get(k); const left = a ? a.english.filter(e => !allow.has(e.s)).slice(0, 3).map(e => '`' + e.s.slice(0, 50).replace(/[|`]/g, ' ') + '`').join(', ') : '';
    L.push(`| ${k} | ${before ? (count(B.get(k)) ?? 'n/a') : 'n/a'} | ${a ? count(a) : 'n/a'} | ${left} |`);
  }
  return L.join('\n') + '\n';
}

// ------------------------------------------------------------------ CLI
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const arg = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
  let list = routes();
  const only = arg('--routes'); if (only) { const s = new Set(only.split(',')); list = list.filter(r => s.has(keyOf(r)) || s.has(r.route)); }
  const widths = arg('--widths') ? arg('--widths').split(',').map(Number) : undefined;
  const { res, errors } = await audit(list, { progress: true, widths, compare: !process.argv.includes('--no-compare') });
  const label = arg('--label') || 'now';
  const json = arg('--json');
  if (json) writeFileSync(json, JSON.stringify({ label, generated: new Date().toISOString(), res }, null, 1));
  const uniq = new Map();
  for (const r of res) for (const e of r.english) { const k = e.s; if (!uniq.has(k)) uniq.set(k, new Set()); uniq.get(k).add(r.key); }
  const total = res.reduce((a, r) => a + r.english.length, 0);
  console.log(JSON.stringify({ label, routes: res.length, englishOnRoutes: total, uniqueEnglish: uniq.size, routeErrors: res.filter(r => r.error).length, pageErrors: errors.length }));
  const md = arg('--md');
  if (md) writeFileSync(md, report(arg('--before') ? JSON.parse(readFileSync(arg('--before'), 'utf8')).res : null, res, label));
  if (process.argv.includes('--list')) for (const [s, rs] of [...uniq].sort((a, b) => b[1].size - a[1].size)) console.log(rs.size + '\t' + s);
}
