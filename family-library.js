/* Futures at Home: the free family library. Routes:
   #at-home (the front door), #story-time[/book] (shelf and read-along reader), #activities[/band or activity], #printables,
   #see-how (picture guides), #family-videos (what exists to watch, and what is planned) and #my-week (weekly plan builder, sticker chart,
   book club and printable certificates).
   Content lives in family-library-data.js (window.FFFamily). Loaded after views.js; registers views on V like whole-child.js does.

   Privacy: this file sends nothing anywhere and asks for nothing about a child. The weekly-plan settings, stickers and the book count
   stay in this browser's localStorage (wrapped in try/catch, so the pages still work when storage is blocked). A name typed on a
   certificate is never stored. "Read to me" uses only voices built into the device (localService), so the story text never leaves it. */
(function () {
'use strict';
if (typeof V === 'undefined' || typeof CH === 'undefined' || !window.FFFamily) return;
const F = window.FFFamily;
const { BOOKS, ACTS, BANDS, FRIENDS, CROWD, GUIDES, PRINTABLES, VIDEOS, SRC } = F;
const PRINT_KIT = F.PRINT_KIT || [];
const FK = ['booker', 'lumi', 'zuri', 'bop'];
const E = s => esc(s);
const col = k => k === 'all' ? 'var(--gold-deep)' : `var(--fl-${k})`;
// Character art from the plush library (FFPlush, plush-cast.js): srcset 480/960 and the manifest's intrinsic size (no layout jump).
const pl = (k, cls, h) => window.FFPlush ? window.FFPlush.img(k, { cls, alt: '', h }) : `<img class="${cls}" src="${img(k)}" alt="" loading="lazy">`;
const art = (k, cls = '') => k === 'all'
  ? `<span class="fl-grp ${cls}" aria-hidden="true">${FK.map(x => pl(x, '', 190)).join('')}</span>`
  : pl(k, cls, 260);
// A story-world room behind the hero friend (FFArt.scene; labelled as an illustration). Falls back to the friend alone.
const scene = (env, chars, o = {}) => window.FFArt && window.FFArt.scene ? window.FFArt.scene(env, Object.assign({ chars, cls: 'fl-scene', sizes: '(max-width:760px) 92vw, 520px', eager: true }, o)) : '';
const ext = (key, text) => { const s = SRC[key]; return s ? `<a href="${s[1]}" target="_blank" rel="noopener noreferrer">${E(text || s[0])}<span class="fl-vh"> (opens in a new tab)</span></a>` : ''; };
const band = id => BANDS.find(b => b.id === id);
const actById = id => ACTS.find(a => a.id === id);
const bookById = id => BOOKS.find(b => b.id === id);
// Finished storybook art (owner 2026-10-07: Booker Tries Again, Sister Edition): [640w, 1200w] WebP pairs from family-library-data.js.
// The art is square (1254 x 1254 masters), so width/height reserve the space before it loads.
const bookImg = (pair, alt, cls, sizes, eager) => `<img class="${cls}" src="${pair[0]}" srcset="${pair[0]} 640w, ${pair[1]} 1200w" sizes="${sizes}" alt="${E(alt)}" width="1200" height="1200" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
const ART_NOTE = '<span class="fl-artnote">Story-world illustration from the finished book</span>';

// ---------------------------------------------------------------- on-device storage (never required, never sent)
const store = {
  get(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { window.localStorage.removeItem(k); } catch (e) { /* storage blocked: nothing to remove */ } }
};
const KEY = { plan: 'ff-at-home-plan', stickers: 'ff-at-home-stickers', books: 'ff-at-home-books' };

// ---------------------------------------------------------------- dates and a seeded shuffle (the plan changes every Monday)
const pad2 = n => String(n).padStart(2, '0');
const isoDay = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function monday(d = new Date()) { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; }
function weekNo(d = new Date()) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 864e5 + 1) / 7); }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(list, r) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// The weekly plan: one story, one thing to do, one move and one calm moment a day, chosen for the age band and the friends picked.
// Deterministic for a given week, band and choice, so a printed plan matches what the page shows.
function buildPlan(o, when = new Date()) {
  const b = BANDS.some(x => x.id === o.band) ? o.band : 'threes';
  const friends = (o.friends || []).filter(k => FK.includes(k)); const pick = friends.length ? friends : FK;
  const mins = [5, 10, 15].includes(+o.mins) ? +o.mins : 10;
  const r = rng(weekNo(when) * 97 + BANDS.findIndex(x => x.id === b) * 13 + mins + pick.map(k => FK.indexOf(k) + 1).join('') * 1);
  const forBand = ACTS.filter(a => a.bands.includes(b));
  const fit = a => a.min <= mins + 5;
  const doPool = shuffle(forBand.filter(a => pick.includes(a.c) && fit(a)), r);
  const moves = shuffle(forBand.filter(a => a.c === 'bop'), r);
  const calms = shuffle(forBand.filter(a => a.c === 'lumi'), r);
  const outside = shuffle(forBand.filter(a => a.where === 'Outdoors'), r);
  const full = BOOKS.filter(x => x.status === 'full');
  const young = b === 'infant' || b === 'toddler';
  const types = Object.keys(CROWD);
  const start = monday(when);
  const used = new Set();
  // Rotate through a list, preferring things not used yet this week, and never the same thing twice in one day.
  const next = (list, i, not) => { for (let k = 0; k < list.length; k++) { const a = list[(i + k) % list.length]; if (a !== not && !used.has(a.id)) return a; } return list.find(a => a !== not) || list[0]; };
  return { band: b, friends: pick, mins, week: isoDay(start), days: DAYS.map((d, i) => {
    const date = new Date(start); date.setDate(start.getDate() + i);
    const weekend = i >= 5;
    const doIt = next(weekend && outside.length ? outside : (doPool.length ? doPool : forBand), i); used.add(doIt.id);
    const move = next(moves, i, doIt); if (move) used.add(move.id);
    const calm = calms.length ? (calms[i % calms.length] !== doIt ? calms[i % calms.length] : calms[(i + 1) % calms.length]) : null;
    const story = young
      ? { t: 'A board book you love', how: 'Point to a picture, name it, and pause for your baby\'s turn.', href: '#activities/point-and-name-book' }
      : (i % 2 === 0 ? { t: full[(i / 2) % full.length].title, how: 'Read it free in Story Time, then try one talk-about-it question.', href: '#story-time/' + full[(i / 2) % full.length].id }
        : { t: 'Any book from your shelf or the library', how: CROWD[types[i % types.length]][0] + ': ' + CROWD[types[i % types.length]][1], href: '#story-time' });
    return { day: d, date: isoDay(date), weekend, story, doIt, move, calm };
  }) };
}

// ---------------------------------------------------------------- shared pieces
const hero = (kick, title, lede, k, acts = '', set = '') => `<header class="fl-hero${set ? ' fl-hero-scene' : ''}" style="--c:${col(k)}"><div class="wrap fl-hero-grid">
  <div class="fl-hero-copy"><nav class="fl-crumbs" aria-label="Breadcrumb"><a href="#at-home">Futures at Home</a>${kick ? ` <span aria-hidden="true">/</span> <span>${kick}</span>` : ''}</nav>
   <h1>${title}</h1><p class="lede">${lede}</p>${acts ? `<div class="fl-acts">${acts}</div>` : ''}</div>
  <div class="fl-hero-art">${set || art(k)}</div></div></header>`;
const sec = (id, kick, h, lede, body, cls = '') => `<section class="fl-sec ${cls}" id="${id}" aria-labelledby="${id}-h"><div class="wrap">
  <div class="fl-head"><span class="fl-kick">${kick}</span><h2 id="${id}-h">${h}</h2>${lede ? `<p>${lede}</p>` : ''}</div>${body}</div></section>`;
const chip = (k, text) => `<span class="fl-chip" style="--c:${col(k)}">${text}</span>`;
const friendChip = k => chip(k, k === 'all' ? 'All four friends' : `${FRIENDS[k].n} &middot; ${FRIENDS[k].p}`);
// owner 2026-10-07: the friend chip on an open activity card is a real link. Bop goes to Bop at Home (straight to this activity's
// video card when it has one); the other friends go to this library filtered to their activities.
const friendLink = a => { const k = a.c, f = FRIENDS[k]; if (!f) return '';
  // only the six Bop at Home videos have a card on #bop-at-home; Bop's other videos (captions.js FRIEND_ACTS) play right on this card
  const C = window.FFCaptions, onBah = !!(a.vid && C && C.BOP_ACTS && C.BOP_ACTS[a.vid]);
  const bop = k === 'bop', href = bop ? `#bop-at-home${onBah ? '/bop-act-' + a.vid : ''}` : `#activities/${k}`;
  return `<a class="fl-chip fl-chiplink" style="--c:${col(k)}" href="${href}">${f.n} &middot; ${f.p}<span class="fl-vh">:</span> <span>${bop ? (onBah ? 'watch Bop do it at Bop at Home' : 'more at Bop at Home') : `all ${f.n}'s activities`}</span> <span aria-hidden="true">&rarr;</span></a>`; };
const actVideo = a => a.vid && window.FFCaptions && window.FFCaptions.actPlayer ? window.FFCaptions.actPlayer(a.vid, a.t) : '';
// whole minutes as before; a video-length card (min = seconds / 60, e.g. 69 / 60) prints its exact length: "1 min 9 sec"
const mins = m => { const t = Math.round(m * 60); return t < 60 ? t + ' sec' : t % 60 === 0 ? t / 60 + ' min' : t % 60 === 30 ? Math.floor(t / 60) + '\u00bd min' : Math.floor(t / 60) + ' min ' + (t % 60) + ' sec'; };
const bandsText = ids => ids.map(id => band(id).n).join(', ');
const privacyNote = `<p class="fl-privacy"><b>No account. Nothing about your child leaves this device.</b> These pages have no ads and no trackers. Anything you save here (your plan settings, stickers and book count) stays in this browser, and you can erase it on <a href="#my-week">My Week</a>.</p>`;

// ---------------------------------------------------------------- #at-home
const DOORS = [
  ['story-time', 'Story Time', 'Five Futures Friends storybooks to read free, page by page, with a question to ask on every page.', 'booker'],
  ['activities', 'Things to do tonight', `${ACTS.length} activities for babies to pre-K, 3 to 15 minutes, made from things you already have.`, 'zuri'],
  ['printables', 'Printables', 'Picture schedule, rainbow tracker, calm-down and move cards, a reading log, a sticker chart and certificates. Some in Spanish.', 'lumi'],
  ['see-how', 'See how: picture guides', 'Eight routines shown in pictures, step by step, for when you would rather see it than read it.', 'bop'],
  ['my-week', 'My Week', 'A plan for your child\'s age that changes every Monday, a sticker chart and certificates you can print.', 'booker'],
  ['family-videos', 'Watch', 'What there is to watch today, what we are filming next and how to keep screen time small.', 'lumi'],
  ['bop-at-home', 'Bop at Home', 'Free movement activities, every one with an adapted version, and a weekly challenge.', 'bop']
];
const DIFF = [
  ['The whole story, not a clip', 'Read every word of five storybooks, page by page, with a question for each page.'],
  ['Made for your child\'s age', 'Pick babies, toddlers, twos, threes or pre-K and see only what fits.'],
  ['Things you can print', 'Fridge schedules, cut-out cards, a reading log and certificates, ready as PDFs.'],
  ['A plan for this week', 'Seven days of small things to do, made for your child\'s age. New every Monday.'],
  ['Your progress stays yours', 'Stickers and book counts are saved on your own device. No account, no sharing.'],
  ['Links that do not get lost', 'Every story and activity has its own link to save, text to family or send to a teacher.']
];
V['at-home'] = () => `<div class="ffl">
 <header class="fl-hero fl-hero-home"><div class="wrap fl-hero-grid">
  <div class="fl-hero-copy"><span class="fl-kick">Free for every family &middot; no account</span>
   <h1>Futures at Home</h1>
   <p class="lede">Stories to read together, things to do tonight, printables for the fridge and a plan for your week, from Booker, Lumi, Zuri and Bop. For babies to pre-K, whether or not your child attends a Futures Friends program.</p>
   <div class="fl-acts"><a class="btn gold" href="#story-time">Read a story</a><a class="btn ghost" href="#my-week">Build my week</a></div></div>
  <div class="fl-hero-art">${art('all')}</div></div></header>
 ${sec('fl-age', 'Start here', 'How old is your child?', 'Pick an age to see activities that fit. Each one takes 3 to 15 minutes.',
  `<div class="fl-bandpick">${BANDS.map(b => `<a class="fl-band" href="#activities/${b.id}"><b>${b.n}</b><span>${b.age}</span><span class="fl-count">${ACTS.filter(a => a.bands.includes(b.id)).length} activities</span></a>`).join('')}</div>`)}
 ${sec('fl-doors', 'Inside the library', 'Everything here is free', '',
  `<div class="fl-doors">${DOORS.map(d => `<a class="fl-door" href="#${d[0]}" style="--c:${col(d[3])}">${art(d[3], 'fl-door-art')}<h3>${d[1]}</h3><p>${d[2]}</p><span class="fl-go" aria-hidden="true">Open &rarr;</span></a>`).join('')}</div>`, 'band-paper')}
 ${sec('fl-diff', 'Why come here', 'More than a video in your feed', 'Short videos are a great way to meet the friends. These pages are where you can do something with them.',
  `<ul class="fl-diff">${DIFF.map(d => `<li><b>${d[0]}</b><span>${d[1]}</span></li>`).join('')}</ul>${privacyNote}`)}
 ${sec('fl-how', 'How it works', 'One story, one thing to do, one move, one calm moment', 'That is the whole idea. A few minutes together, most days, with the same words your child hears in a Futures classroom.',
  `<ol class="fl-four">${FK.map(k => `<li style="--c:${col(k)}">${art(k)}<b>${FRIENDS[k].n}: ${FRIENDS[k].p}</b><span>${FRIENDS[k].t}</span><q>${E(FRIENDS[k].line)}</q></li>`).join('')}</ol>
   ${window.FFSupporting && window.FFSupporting.cameo ? `<div class="fl-family-cameo">${window.FFSupporting.cameo(['bruno', 'booker', 'rose', 'lumi', 'sage', 'zuri', 'ella', 'bop'], { caption: 'Every friend has a grown-up at home, too.', cls: 'fl-cameo' })}</div>` : ''}
   <p class="fl-note">The activities follow published guidance, cited on each card: reading aloud from birth and asking questions while you read (${ext('aapRead', 'AAP')}, ${ext('dialogic', 'Reading Rockets')}), back-and-forth play (${ext('serve', 'Harvard Center on the Developing Child')}) and daily active play (${ext('who', 'WHO 2019')}). They were written by the Futures Friends team; an outside early-childhood specialist review is planned. "What to notice" notes are for noticing, never for diagnosing.</p>`, 'band-paper')}
</div>`;

// ---------------------------------------------------------------- #story-time
const R = { book: null, page: 0, size: 1, point: false, wi: -1, speaking: false };
const SIZES = [['Smaller', .86], ['Regular', 1], ['Big', 1.2], ['Biggest', 1.42]];

function shelf() {
  return `<div class="ffl">${hero('Story Time', 'Story Time', 'Read a Futures Friends storybook together, one page at a time. Every page has a question to ask, a word to talk about and sometimes a move or a breath to share.', 'booker', `<a class="btn gold" href="#story-time/${BOOKS[0].id}">Start with Booker</a>`, scene('reading-corner', [['booker-reading', 33], ['tilly', 63], ['mimi', 80]], { u: 78, line: 'The storybook reading corner, not a photo of our center' }))}
  ${sec('fl-shelf', 'The bookshelf', 'Five stories, all free to read', 'Read every page of all five books here. Booker Tries Again has its finished pictures. For the other four, each page tells you what the picture shows, so your child can imagine it, or draw it.',
   `<div class="fl-shelfgrid">${BOOKS.map(b => `<article class="fl-book" style="--c:${col(b.c)}">${b.cover ? `<div class="fl-cover fl-cover-real">${bookImg(b.cover, b.title + ' cover: ' + b.coverAlt, 'fl-cover-img', '(max-width:460px) 180px, 200px')}<span class="fl-cover-n">Book ${b.n}</span></div>` : `<div class="fl-cover">${art(b.c === 'booker' ? 'booker-reading' : b.c)}<span class="fl-cover-t">${E(b.title)}</span><span class="fl-cover-n">Book ${b.n}</span></div>`}
     <div class="fl-book-bd">${friendChip(b.c)} ${b.status === 'full' ? chip('zuri', 'Free to read') : `<span class="fl-chip fl-chip-soft">Preview &middot; full book soon</span>`}
      <h3>${E(b.title)}</h3><p>${E(b.log)}</p><p class="fl-meta">${b.words} words &middot; about ${b.mins} minutes aloud &middot; ages 2 to 5</p>
      <a class="btn ${b.status === 'full' ? 'navy' : 'soft'}" href="#story-time/${b.id}">${b.status === 'full' ? 'Read it together' : 'See the preview'}</a></div></article>`).join('')}</div>`)}
  ${sec('fl-crowd', 'How to read together', 'Ask, wait, add a little', 'Asking questions while you read, and building on your child\'s answers, is called dialogic reading. Each page in Story Time is labeled with one of five kinds of question, so you learn them as you go.',
   `<ul class="fl-crowdlist">${Object.entries(CROWD).map(([k, v]) => `<li><b>${v[0]}</b><span>${v[1]}</span></li>`).join('')}</ul>
    <p class="fl-note">When your child answers: say something kind about it, add a word or two, and let them say it again (the PEER steps). Sources: ${ext('dialogic')}; ${ext('peer')}; ${ext('aapRead')}.</p>`, 'band-paper')}
  ${sec('fl-imagination', 'More books at home', 'Free books and library cards', '',
   `<p class="fl-note" style="max-width:70ch">Your public library card is free and opens thousands of picture books, many with read-along audio. Dolly Parton's Imagination Library mails free books to young children where a local program is accepting sign-ups; check <a href="https://imaginationlibrary.com/" target="_blank" rel="noopener noreferrer">imaginationlibrary.com<span class="fl-vh"> (opens in a new tab)</span></a> for your area. Then try the same questions from Story Time with any book.</p>`)}</div>`;
}

function preview(b) {
  return `<div class="ffl">${hero('Story Time', E(b.title), E(b.log), b.c, `<a class="btn soft" href="#story-time">Back to the bookshelf</a>`)}
  ${sec('fl-prev', `Book ${b.n} &middot; preview`, 'The full read-along is coming soon', E(b.why),
   `<div class="fl-prevgrid"><div class="fl-card"><h3>The say-along line</h3><p class="fl-refrain" style="--c:${col(b.c)}">${E(b.refrain)}</p><p class="fl-meta">${b.words} words &middot; about ${b.mins} minutes aloud</p></div>
    ${actDetail({ id: 'prev-' + b.id, t: b.act.t, c: b.c === 'all' ? 'zuri' : b.c, bands: ['twos', 'threes', 'prek'], min: b.act.min, where: 'At home', mat: b.act.mat, steps: b.act.steps, adapt: [b.act.adapt], notice: [], say: b.refrain, src: [] }, true)}</div>
    <p class="fl-note">Want something to read today? ${BOOKS.filter(x => x.status === 'full').map(x => `<a href="#story-time/${x.id}">${E(x.title)}</a>`).join(', ')} are free to read now.</p>`)}</div>`;
}

// Page text as word spans; refrain words are marked so children learn to spot "their" line.
function words(text, refrain) {
  const parts = [refrain].concat(refrain.split(/(?<=[.!?])\s+/)).filter(Boolean);
  const marks = [];
  for (const p of parts) { let i = text.indexOf(p); while (i > -1) { marks.push([i, i + p.length]); i = text.indexOf(p, i + 1); } }
  let html = '', n = 0, pos = 0;
  for (const tok of text.split(/(\s+)/)) {
    if (/^\s+$/.test(tok) || !tok) { html += tok; pos += tok.length; continue; }
    const ref = marks.some(m => pos < m[1] && pos + tok.length > m[0]);
    html += `<span class="fl-w${ref ? ' fl-ref' : ''}" data-wi="${n}" data-at="${pos}">${E(tok)}</span>`;
    n++; pos += tok.length;
  }
  return html;
}
// For recorded narration (none exists yet): which word is being read at time t, given each word's start time in seconds.
function wordAt(times, t) { let i = -1; for (let k = 0; k < times.length; k++) { if (times[k] <= t) i = k; else break; } return i; }

function readerPage(b) {
  const last = b.spreads.length + 1, p = R.page;
  if (p === 0) return `<div class="fl-page fl-page-cover${b.cover ? ' fl-page-art' : ''}" style="--c:${col(b.c)}">
    <div class="fl-text"><span class="fl-kick">Book ${b.n} &middot; A Futures Friends Story</span><h2 class="fl-btitle">${E(b.title)}</h2>
     <p class="fl-say">Say-along line: <span class="fl-ref">${E(b.refrain)}</span></p><p>${E(b.gesture)}</p></div>
    <div class="fl-pic">${b.cover ? `<figure class="fl-art">${bookImg(b.cover, b.title + ' cover: ' + b.coverAlt, 'fl-art-img', '(max-width:760px) 92vw, 460px', true)}<figcaption>${ART_NOTE}</figcaption></figure>` : art(b.c, 'fl-pic-art')}<p><b>Before you read:</b> look at the cover together and ask, "What do you think will happen?"</p><p class="fl-meta">${E(b.back)}</p></div></div>`;
  if (p === last) return `<div class="fl-page fl-page-end" style="--c:${col(b.c)}">
    <div class="fl-text"><h2 class="fl-btitle">The End</h2><h3>Talk about it</h3><ol>${b.talk.map(q => `<li>${E(q)}</li>`).join('')}</ol><p class="fl-meta"><b>Reading tip:</b> ${E(b.tip)}</p></div>
    <div class="fl-pic fl-endside"><h3>Try it together: ${E(b.act.t)}</h3><p class="fl-meta">${b.act.min} minutes &middot; ${b.act.mat.map(E).join(' &middot; ')}</p><ol>${b.act.steps.map(s => `<li>${E(s)}</li>`).join('')}</ol><p class="fl-meta"><b>Adapt it:</b> ${E(b.act.adapt)}</p>
     <p class="fl-home"><b>Take it home:</b> ${E(b.home)}</p>
     <div class="fl-acts">${(b.c === 'all' ? FK : [b.c]).map(k => `<button type="button" class="btn gold" data-fl="sticker" data-k="${k}">Add a ${FRIENDS[k].n} sticker to My Week</button>`).join('')}<button type="button" class="btn soft" data-fl="bookread">Count it in the Book Club</button></div></div></div>`;
  const s = b.spreads[p - 1];
  return `<div class="fl-page${s.img ? ' fl-page-art' : ''}" style="--c:${col(b.c)}">
   <div class="fl-text"><p class="fl-story" id="flStory">${words(s.p, b.refrain)}</p></div>
   ${s.img ? `<figure class="fl-pic fl-art">${bookImg(s.img, s.pic, 'fl-art-img', '(max-width:760px) 92vw, 460px', false)}<figcaption>${ART_NOTE}</figcaption></figure>`
    : `<div class="fl-pic"><span class="fl-kick">Picture this</span>${art(b.c, 'fl-pic-art')}<p>On this page: ${E(s.pic)}</p><p class="fl-meta">Close your eyes and picture it together, then ask your child to draw this page.</p></div>`}
   <div class="fl-prompt" role="group" aria-labelledby="flPromptH"><h3 id="flPromptH">Read with your child</h3>
    <p><span class="fl-qtype" title="${E(CROWD[s.q[0]][1])}">${CROWD[s.q[0]][0]}</span> ${E(s.q[1])}</p>
    ${s.w ? `<p><span class="fl-qtype fl-qword">Word to talk about</span> <b>${E(s.w[0])}</b>: ${E(s.w[1])}</p>` : ''}
    ${s.b ? `<p><span class="fl-qtype fl-qmove">Move or breathe</span> ${E(s.b)}</p>` : ''}
    ${s.tip ? `<p class="fl-meta"><b>Tip:</b> ${E(s.tip)}</p>` : ''}</div></div>`;
}

function reader(b) {
  const total = b.spreads.length + 2;
  return `<div class="ffl fl-readerwrap">
  <section class="fl-reader" id="flReader" aria-labelledby="flReaderH" style="--c:${col(b.c)};--fl-size:${SIZES[R.size][1]}" data-book="${b.id}">
   <div class="wrap">
    <div class="fl-rbar"><a class="fl-back" href="#story-time">&larr; Bookshelf</a><h1 id="flReaderH">${E(b.title)}</h1>${friendChip(b.c)}</div>
    <div class="fl-tools" role="toolbar" aria-label="Reading tools">
     <button type="button" class="fl-tool" data-fl="size" data-d="-1" aria-label="Smaller words">A&minus;</button><button type="button" class="fl-tool" data-fl="size" data-d="1" aria-label="Bigger words">A+</button>
     <button type="button" class="fl-tool" data-fl="point" aria-pressed="${R.point}">Point and read</button>
     <button type="button" class="fl-tool" data-fl="speak" id="flSpeak" hidden>Read to me</button></div>
    <p class="fl-pointhelp" id="flPointHelp" ${R.point ? '' : 'hidden'}>Point and read: tap a word, or press <kbd>Space</kbd> or the Next word button, to move the highlight one word at a time, the way Booker slides his paw under each word.</p>
    <div class="fl-stage" id="flStage" tabindex="-1" role="group" aria-label="${R.page === 0 ? 'Cover' : R.page === total - 1 ? 'The End' : `Page ${R.page} of ${b.spreads.length}`}">${readerPage(b)}</div>
    <div class="fl-nav"><button type="button" class="btn soft" data-fl="prev" ${R.page === 0 ? 'disabled' : ''}>&larr; Back</button>
     <span class="fl-count" id="flCount">${R.page === 0 ? 'Cover' : R.page === total - 1 ? 'The End' : `Page ${R.page} of ${b.spreads.length}`}</span>
     <button type="button" class="btn soft" data-fl="nextword" ${R.point && R.page > 0 && R.page < total - 1 ? '' : 'hidden'}>Next word</button>
     <button type="button" class="btn navy" data-fl="next" ${R.page === total - 1 ? 'disabled' : ''}>Next &rarr;</button></div>
    <p class="fl-voice" id="flVoice" aria-live="polite"></p>
    <div class="fl-dots" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i === R.page ? 'on' : ''}"></i>`).join('')}</div>
    <p class="fl-note">Use the arrow keys or swipe to turn pages. Text from <i>${E(b.title)}</i>, Futures Friends Storybook Series, ${b.cover ? 'digital Sister Edition, text and illustrations' : E(b.src || 'manuscript v1.0')}. &copy; 2026 Futures Friends. Questions written for families using the dialogic-reading method (${ext('dialogic', 'Reading Rockets')}).</p>
   </div></section></div>`;
}

V['story-time'] = () => {
  const b = typeof arg === 'string' ? bookById(arg) : null;
  if (!b) return shelf();
  if (b.status !== 'full') return preview(b);
  if (R.book !== b.id) { R.book = b.id; R.page = 0; R.wi = -1; }
  return reader(b);
};

function curBook() { return bookById(R.book); }
// The reader is redrawn as a whole, so keyboard focus is put back on the control that was used (Next stays Next), and a
// persistent status line (FFA11y.announce, outside the redrawn part) says where the reader is. A control that is now disabled
// (Back on the cover, Next on the last page) hands focus to the page itself.
function redrawReader() {
  stopSpeech();
  const b = curBook(), el = document.getElementById('flReader'); if (!b || !el) return;
  const was = document.activeElement, key = was && el.contains(was) && was.dataset ? (was.dataset.fl || '') : '';
  const fresh = document.createElement('div'); fresh.innerHTML = reader(b);
  el.replaceWith(fresh.querySelector('#flReader'));
  R.wi = -1; setupVoice();
  if (key) {
    const again = document.querySelector(`#flReader [data-fl="${key}"]:not([disabled]):not([hidden])`) || document.getElementById('flStage');
    if (again) again.focus({ preventScroll: true });
  }
}
function pageLabel(b) { return R.page === 0 ? 'Cover' : R.page === b.spreads.length + 1 ? 'The End' : `Page ${R.page} of ${b.spreads.length}`; }
function say(text) { if (window.FFA11y) window.FFA11y.announce(text); }
function turn(d) {
  const b = curBook(); if (!b) return;
  const n = Math.min(b.spreads.length + 1, Math.max(0, R.page + d));
  if (n === R.page) { say(d > 0 ? 'This is the last page.' : 'This is the cover.'); return; }
  R.page = n; redrawReader();
  const s = R.page > 0 && R.page <= b.spreads.length ? b.spreads[R.page - 1].p : '';
  say(`${pageLabel(b)}.${s ? ' ' + s : ''}`);
}
function mark(i) {
  const ws = document.querySelectorAll('#flStory .fl-w'); if (!ws.length) return;
  ws.forEach(w => w.classList.remove('fl-now'));
  R.wi = i;
  if (i >= 0 && i < ws.length) { ws[i].classList.add('fl-now'); }
}

// "Read to me": device voices only. If the device has none, the button stays hidden and says why.
let voice = null;
function pickVoice() {
  const ss = window.speechSynthesis; if (!ss || !window.SpeechSynthesisUtterance) return null;
  const local = ss.getVoices().filter(v => v.localService && /^en(-|_|$)/i.test(v.lang));
  return local.find(v => /en-US/i.test(v.lang)) || local[0] || null;
}
// Voices load late in some browsers (Chrome fills getVoices() only after "voiceschanged"), so "no voice" is said only once
// the list has settled; the note sits under the page so it never moves the book.
let voicesSettled = false, voiceWait = null;
function setupVoice(e) {
  if (e && e.type === 'voiceschanged') voicesSettled = true;
  const btn = document.getElementById('flSpeak'), note = document.getElementById('flVoice'); if (!btn) return;
  voice = pickVoice();
  const onPage = R.page > 0 && curBook() && R.page <= curBook().spreads.length;
  btn.hidden = !voice || !onPage;
  if (!voice && !voicesSettled && !voiceWait && window.speechSynthesis && !window.speechSynthesis.getVoices().length) voiceWait = setTimeout(() => { voicesSettled = true; setupVoice(); }, 1500);
  if (note) note.textContent = !window.speechSynthesis || (!voice && !voicesSettled) ? '' : (!voice ? 'Read to me needs a voice built into your device. None was found, so read it yourself: you are the best voice anyway.' : '');
}
if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.addEventListener) {
  try { window.speechSynthesis.addEventListener('voiceschanged', setupVoice); } catch (e) { /* older browsers */ }
}
function stopSpeech() { try { if (R.speaking && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ } R.speaking = false; }
function speak() {
  const b = curBook(); if (!b || !voice || R.page < 1 || R.page > b.spreads.length) return;
  if (R.speaking) { stopSpeech(); mark(-1); return; }
  const text = b.spreads[R.page - 1].p, starts = [...document.querySelectorAll('#flStory .fl-w')].map(w => +w.dataset.at);
  const u = new SpeechSynthesisUtterance(text); u.voice = voice; u.lang = voice.lang; u.rate = .85;
  u.onboundary = e => { if (e.name && e.name !== 'word') return; let i = 0; while (i + 1 < starts.length && starts[i + 1] <= e.charIndex) i++; mark(i); };
  u.onend = u.onerror = () => { R.speaking = false; mark(-1); const btn = document.getElementById('flSpeak'); if (btn) btn.textContent = 'Read to me'; };
  R.speaking = true; const btn = document.getElementById('flSpeak'); if (btn) btn.textContent = 'Stop reading';
  window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
}

// ---------------------------------------------------------------- #activities
const A = { band: '', friend: '' };
function actDetail(a, open = false) {
  const adapt = a.adapt || [];
  const labels = adapt.length === 3 ? ['Make it easier', 'Make it a stretch', 'Every body can join'] : ['Adapt it'];
  return `<details class="fl-act" id="act-${a.id}" style="--c:${col(a.c)}" ${open ? 'open' : ''}>
   <summary><span class="fl-act-art">${art(a.c)}</span><span class="fl-act-sum"><b>${E(a.t)}</b><span class="fl-meta">${mins(a.min)} &middot; ${E(a.where)} &middot; ${bandsText(a.bands)}</span>${friendChip(a.c)}</span></summary>
   <div class="fl-act-bd">
    ${actVideo(a)}${friendLink(a)}
    <div><h3>You need</h3><ul>${a.mat.map(m => `<li>${E(m)}</li>`).join('')}</ul></div>
    <div><h3>Steps</h3><ol>${a.steps.map(s => `<li>${E(s)}</li>`).join('')}</ol></div>
    ${a.notice && a.notice.length ? `<div class="fl-notice"><h3>What you might notice</h3><ul>${a.notice.map(s => `<li>${E(s)}</li>`).join('')}</ul><p class="fl-meta">For noticing, not for testing. Every child grows on their own timeline.</p></div>` : ''}
    <div class="fl-adapt">${adapt.map((x, i) => `<p><b>${labels[i] || 'Adapt it'}:</b> ${E(x)}</p>`).join('')}</div>
    ${a.safety ? `<p class="fl-safety"><b>Safety:</b> ${E(a.safety)}</p>` : ''}
    <p class="fl-sayit"><span>Say:</span> &ldquo;${E(a.say)}&rdquo;</p>
    ${a.src && a.src.length ? `<p class="fl-meta">Why this helps: ${a.src.map(k => ext(k)).join('; ')}</p>` : ''}
    ${a.id.indexOf('prev-') === 0 ? '' : `<div class="fl-acts"><button type="button" class="btn soft" data-fl="print" data-target="act-${a.id}">Print this card</button><button type="button" class="btn soft" data-fl="share" data-href="#activities/${a.id}" data-title="${E(a.t)}">Copy link</button><button type="button" class="btn soft" data-fl="sticker" data-k="${a.c}">We did it: add a sticker</button></div>`}
   </div></details>`;
}
function actList() {
  const list = ACTS.filter(a => (!A.band || a.bands.includes(A.band)) && (!A.friend || a.c === A.friend));
  return `<p class="fl-meta" role="status">${list.length} ${list.length === 1 ? 'activity' : 'activities'}${A.band ? ' for ' + band(A.band).n.toLowerCase() : ''}${A.friend ? ' with ' + FRIENDS[A.friend].n : ''}</p>
   <div class="fl-actgrid">${list.map(a => actDetail(a)).join('') || '<p>No activities match. Try another friend.</p>'}</div>`;
}
// #activities/<friend>: the friend's own play-along videos first (their video section), each tied to its activity card,
// then the friend's own storybook right under them (owner 2026-10-07: "there's an actual book, we need to see that book in his section").
function friendVideos(k) {
  const C = window.FFCaptions, list = C && C.friendActs ? C.friendActs(k) : [];
  const book = friendBook(k);
  if (!list.length) return book ? sec('fl-friendvids', `${FRIENDS[k].n}'s book`, `Read with ${FRIENDS[k].n}`, '', book) : '';
  const card = slug => ACTS.find(a => a.vid === slug) || GUIDES.find(g => g.vid === slug);
  return sec('fl-friendvids', `Watch ${FRIENDS[k].n}`, `Play along with ${FRIENDS[k].n}`,
   `Short story-world videos to watch together, then try for real. ${list.length} ${list.length === 1 ? 'video' : 'videos'} so far.`,
   `<div class="fl-friendvid-grid" id="watch-${k}">${list.map(slug => { const c = card(slug), t = C.FRIEND_ACTS[slug].t;
     return `<div class="fl-friendvid">${C.actPlayer(slug, t)}${c && ACTS.includes(c) ? `<a class="fl-meta" href="#activities/${c.id}">Open the ${E(c.t)} card &rarr;</a>` : ''}</div>`; }).join('')}</div>${book}`);
}
// A friend's own storybook, shown in that friend's section (#activities/<friend>, and #bop-at-home for Bop via FFFamilyUI.friendBook).
// Booker's book has its finished art, so it shows the real cover and the three pages where he does the brave reader steps from his
// video. Lumi's and Bop's covers are the labeled layout previews (the same files as #friends); Zuri's book has no cover art yet, so it
// gets the shelf's felt cover. Books without finished pictures peek at their opening words instead.
const FB = {
  booker: { link: 'Watch Booker\'s brave reader steps, then read his book.', blurb: 'Booker\'s new book has a word he cannot read... yet. Watch him try, and try again.',
    peek: [[5, 'Look at the picture'], [6, 'Say the first sound'], [7, 'Slide your paw under the word']] },
  lumi: { link: 'Breathe along with Lumi, then read her book.', blurb: 'Pip is new and all alone. Breathe along with Lumi as she finds her calm and her kind words.',
    cover: ['img/big-feelings-brighter-days-cover-400.webp', 'img/big-feelings-brighter-days-cover-800.webp'] },
  zuri: { link: 'Wonder along with Zuri, then read her book.', blurb: 'An ice cube disappears from the sunny porch. Wonder along with Zuri as she guesses, tries and finds out.' },
  bop: { link: 'Move with Bop, then peek at his book.', blurb: 'The Clubhouse is a giant mess. One toy at a time and one happy song, Bop learns he can do it himself.',
    cover: ['img/clean-up-team-cover-400.webp', 'img/clean-up-team-cover-800.webp'] }
};
// the opening of a page: whole sentences up to about 120 characters (a page that starts "Plink!" still says something)
const firstLine = p => { const parts = String(p).match(/[^.!?]+[.!?]+[\u201D"]?\s*/g) || [String(p)]; let o = '';
  for (const x of parts) { if (o && (o + x).length > 120) break; o += x; } return o.trim() + (o.trim().length < String(p).trim().length ? ' \u2026' : ''); };
function friendBook(k) {
  const b = BOOKS.find(x => x.c === k), f = FB[k];
  if (!b || !f) return '';
  const n = FRIENDS[k].n, full = b.status === 'full', href = `#story-time/${b.id}`, go = full ? `Read ${E(b.title)}` : `See the preview of ${E(b.title)}`;
  const cover = b.cover
    ? `<a class="fl-fb-cover" href="${href}" aria-label="${go}">${bookImg(b.cover, b.title + ' cover: ' + b.coverAlt, 'fl-fb-cover-img', '(max-width:640px) 62vw, 260px')}</a>`
    : f.cover
      ? `<a class="fl-fb-cover" href="${href}" aria-label="${go}"><img class="fl-fb-cover-img" src="${f.cover[0]}" srcset="${f.cover[0]} 400w, ${f.cover[1]} 800w" sizes="(max-width:640px) 62vw, 260px" alt="Cover layout preview: ${E(b.title)}, Book ${b.n}, with ${n}" width="800" height="800" loading="lazy" decoding="async"></a>`
      : `<a class="fl-fb-cover fl-cover" style="--c:${col(k)}" href="${href}" aria-label="${go}">${art(k)}<span class="fl-cover-t">${E(b.title)}</span><span class="fl-cover-n">Book ${b.n}</span></a>`;
  const sp = b.spreads || [];
  const peek = f.peek && sp.length
    ? `<ol class="fl-fb-peek" aria-label="Three pages from the book">${f.peek.map(([i, cap], j) => sp[i] && sp[i].img ? `<li><a href="${href}"><img src="${sp[i].img[0]}" alt="${E(sp[i].pic)}" width="640" height="640" loading="lazy" decoding="async"><span><b>${j + 1}</b> ${E(cap)}</span></a></li>` : '').join('')}</ol>`
    : sp.length
      ? `<ol class="fl-fb-peek fl-fb-peek-txt" aria-label="The first pages of the book">${sp.slice(0, 3).map((s, j) => `<li><span class="fl-meta">Page ${j + 1}</span><p>${E(firstLine(s.p))}</p></li>`).join('')}</ol><p class="fl-meta">The pictures are still being drawn, so each page tells you what the picture will show.</p>`
      : `<p class="fl-fb-refrain">&ldquo;${E(b.refrain)}&rdquo;</p>`;
  return `<article class="fl-fbook" style="--c:${col(k)}" aria-labelledby="fl-fbook-${k}-h">
   <p class="fl-fb-link">${E(f.link)}</p>
   <div class="fl-fb-grid">${cover}
    <div class="fl-fb-bd"><span class="fl-kick">${n}'s book &middot; Book ${b.n}</span><h3 id="fl-fbook-${k}-h">${E(b.title)}</h3>
     ${full ? chip('zuri', 'Free to read') : '<span class="fl-chip fl-chip-soft">Preview &middot; full book soon</span>'}
     <p>${E(f.blurb)}</p>
     <a class="btn gold fl-fb-go" href="${href}">${full ? 'Read the book' : 'See the book preview'}</a></div></div>
   ${peek}</article>`;
}
const seg = (name, cur, opts) => `<div class="seg fl-seg" role="group" aria-label="${name}">${opts.map(o => `<button type="button" data-fl="filter" data-f="${name === 'Age' ? 'band' : 'friend'}" data-v="${o[0]}" aria-pressed="${cur === o[0]}">${o[1]}</button>`).join('')}</div>`;
V.activities = () => {
  const a = typeof arg === 'string' ? arg : '';
  const one = actById(a);
  if (BANDS.some(b => b.id === a)) A.band = a;
  if (FK.includes(a)) A.friend = a;   // #activities/<friend>: the friend chip's link
  return `<div class="ffl">${hero('Things to do', 'Things to do tonight', `${ACTS.length} short activities for babies to pre-K, made from things you already have at home. Each one has steps, what you might notice and ways to make it easier or harder.`, 'zuri')}
   ${one ? sec('fl-one', 'Activity', E(one.t), '', `<div class="fl-actgrid fl-actone">${actDetail(one, true)}</div>`, 'band-paper') : ''}
   ${!one && A.friend ? friendVideos(A.friend) : ''}
   ${sec('fl-lib', 'The activity library', 'Find one that fits', 'Pick an age and a friend. Open any card to see the steps.',
    `<div class="fl-filters">${seg('Age', A.band, [['', 'All ages']].concat(BANDS.map(b => [b.id, b.n])))}${seg('Friend', A.friend, [['', 'All friends']].concat(FK.map(k => [k, FRIENDS[k].n])))}</div>
     <div id="flActList">${actList()}</div>
     <p class="fl-note">"What you might notice" is for noticing, never for diagnosing. If something worries you, trust that feeling and talk with your child's doctor. The CDC's free milestone checklists and Milestone Tracker app can help you prepare (${ext('cdc', 'CDC Learn the Signs. Act Early.')}). In Missouri, families can ask for a free evaluation through First Steps (birth to 3) or their school district (ages 3 to 5); see <a href="#include">Futures Include</a>.</p>`)}</div>`;
};

// ---------------------------------------------------------------- #printables
V.printables = () => `<div class="ffl">${hero('Printables', 'Printables', 'Print-ready PDFs for the fridge, the bedroom door and the car. US Letter size, made to print in color or black and white, free to print at home or at the library.', 'lumi', `<a class="btn gold" href="${F.PACK}" download>Download the starter pack (all ${PRINTABLES.length})</a>`)}
 ${sec('fl-pdfs', 'Download and print', 'Pick what you need', 'Every file is a real PDF made from our own art. Nothing to sign up for.',
  `<div class="fl-pdfgrid">${PRINTABLES.map(p => `<article class="fl-pdf" style="--c:${col(p.c)}"><a class="fl-thumb" href="${p.f}" download aria-label="Download ${E(p.t)} (PDF)"><img src="printables/previews/${p.id}.png" alt="Preview of the first page of ${E(p.t)}" loading="lazy" width="300" height="388"></a>
    <div class="fl-pdf-bd"><h3>${E(p.t)}</h3><p>${E(p.d)}</p><p class="fl-meta">PDF &middot; ${p.pages} ${p.pages === 1 ? 'page' : 'pages'} &middot; US Letter</p>
     <div class="fl-acts"><a class="btn navy" href="${p.f}" download>Download PDF</a>${p.es ? `<a class="btn soft" href="${p.es}" download lang="es">En espa&ntilde;ol (borrador)</a>` : ''}</div></div></article>`).join('')}</div>
   <p class="fl-note" lang="es"><b>Espa&ntilde;ol:</b> tres materiales est&aacute;n disponibles en espa&ntilde;ol como borrador. La traducci&oacute;n est&aacute; pendiente de revisi&oacute;n por un hablante nativo.</p>
   <p class="fl-note">Spanish versions of three printables are drafts awaiting review by a native speaker. Tip: print the cut-out cards on card stock, or glue them to a cereal box, so they last.</p>`)}
 ${PRINT_KIT.some(k => k.family) ? sec('fl-kit', 'Books near you', 'Library cards and free books', 'A one-page sheet for families in and around Independence, Missouri: how to get a library card and join free reading programs. Every fact is sourced on the sheet.',
  `<ul class="fl-planned">${PRINT_KIT.filter(k => k.family).map(k => `<li>${k.draft ? '<span class="fl-chip fl-chip-soft">Draft</span>' : '<span class="fl-chip fl-chip-soft">Facts checked 2026-10-05</span>'}<b>${E(k.t)}</b><span class="fl-meta">PDF &middot; ${k.pages} ${k.pages === 1 ? 'page' : 'pages'} &middot; US Letter</span><span>${E(k.d)}</span><a class="btn soft" style="justify-self:start" href="${k.f}" download>Download PDF<span class="fl-vh">: ${E(k.t)}</span></a></li>`).join('')}</ul>`, 'band-paper') : ''}</div>`;

// ---------------------------------------------------------------- #see-how (picture guides, drawn here)
const ic = (body, vb = '0 0 64 64') => `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;
const S = 'fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  flower: ic(`<g ${S}><circle cx="32" cy="22" r="6"/><circle cx="32" cy="10" r="6"/><circle cx="43" cy="20" r="6"/><circle cx="21" cy="20" r="6"/><circle cx="38" cy="32" r="6"/><circle cx="26" cy="32" r="6"/><path d="M32 38v22M32 50c-6-6-12-6-14-4M32 54c6-6 12-6 14-4"/></g>`),
  nose: ic(`<g ${S}><path d="M30 12c-2 12-10 22-10 30a8 8 0 0 0 16 0"/><path d="M44 30c4-2 10-2 14 2M44 40c4 0 10 2 12 6" stroke-dasharray="3 5"/><path d="M14 36l-6-2M14 44l-6 2"/></g>`),
  candle: ic(`<g ${S}><rect x="24" y="28" width="16" height="30" rx="3"/><path d="M32 28v-6"/><path d="M32 6c5 6 6 10 0 16-6-6-5-10 0-16z"/></g>`),
  blow: ic(`<g ${S}><circle cx="20" cy="32" r="12"/><circle cx="20" cy="32" r="3"/><path d="M34 26h14M36 32h20M34 38h14" stroke-dasharray="4 5"/></g>`),
  three: ic(`<g ${S}><circle cx="14" cy="32" r="7"/><circle cx="32" cy="32" r="7"/><circle cx="50" cy="32" r="7"/></g><g fill="currentColor"><circle cx="14" cy="32" r="2.5"/><circle cx="32" cy="32" r="2.5"/><circle cx="50" cy="32" r="2.5"/></g>`),
  eye: ic(`<g ${S}><path d="M4 32c8-12 18-18 28-18s20 6 28 18c-8 12-18 18-28 18S12 44 4 32z"/><circle cx="32" cy="32" r="9"/></g><circle cx="32" cy="32" r="3.5" fill="currentColor"/>`),
  letter: ic(`<g ${S}><rect x="8" y="8" width="48" height="48" rx="8"/><path d="M24 46V18M24 32l14-14M28 30l12 16"/></g>`),
  slide: ic(`<g ${S}><path d="M8 24h48" stroke-dasharray="8 6"/><path d="M14 44c4-6 10-6 14 0l4-10c2-4 8-2 6 2l-4 12h12c4 0 4 6 0 6H18"/><path d="M42 18l8 6-8 6"/></g>`),
  thumbs: ic(`<g ${S}><path d="M20 30h-8v24h8zM20 32l10-20c4 0 6 3 5 7l-2 9h14c4 0 6 3 5 6l-4 14c-1 3-3 4-6 4H20"/></g>`),
  think: ic(`<g ${S}><circle cx="30" cy="38" r="14"/><path d="M24 40h12M27 34h6"/><circle cx="48" cy="16" r="6"/><circle cx="56" cy="6" r="2.5"/></g>`),
  hand: ic(`<g ${S}><path d="M20 34V14c0-4 6-4 6 0v16M26 30V8c0-4 6-4 6 0v22M32 30V10c0-4 6-4 6 0v22M38 32V18c0-4 6-4 6 0v20c0 12-8 20-18 20-6 0-10-4-14-10l-6-10c-2-4 3-7 6-4l6 6"/></g>`),
  compare: ic(`<g ${S}><path d="M32 8v48M14 16h36M14 16L6 34h16zM50 16l-8 18h16z"/><path d="M22 56h20"/></g>`),
  stomp: ic(`<g ${S}><ellipse cx="22" cy="44" rx="10" ry="12"/><ellipse cx="44" cy="30" rx="10" ry="12"/><path d="M6 14l6 6M16 8l2 8M54 52l-4-6M60 44l-8-2"/></g>`),
  sway: ic(`<g ${S}><path d="M32 10c-10 0-14 8-14 16 0 6 4 10 4 18 0 6-4 10-8 12M32 10c10 0 14 8 14 16"/><path d="M8 30c-4 4-4 10 0 14M56 30c4 4 4 10 0 14"/></g>`),
  freeze: ic(`<g ${S}><path d="M32 6v52M8 20l48 24M8 44l48-24"/><path d="M26 10l6 6 6-6M26 54l6-6 6 6"/></g>`),
  water: ic(`<g ${S}><path d="M20 12h24l-4 44H24z"/><path d="M22 28c6 3 14 3 20 0"/></g>`),
  calm: ic(`<g ${S}><circle cx="32" cy="32" r="22"/><path d="M22 28c2-2 6-2 8 0M34 28c2-2 6-2 8 0M24 40c4 4 12 4 16 0"/></g>`),
  ear: ic(`<g ${S}><path d="M20 26c0-10 8-18 18-18s16 8 16 16c0 10-10 12-10 22 0 6-4 10-10 10s-8-4-8-6"/><path d="M30 26c0-4 4-8 8-8s8 4 8 8"/><path d="M6 20c-3 6-3 14 0 20M12 24c-2 4-2 8 0 12"/></g>`),
  soft: ic(`<g ${S}><path d="M6 40c8-8 16 8 26 0s18 8 26 0"/><path d="M6 26c8-8 16 8 26 0s18 8 26 0"/></g>`),
  moon: ic(`<g ${S}><path d="M40 8a22 22 0 1 0 16 34A18 18 0 0 1 40 8z"/><path d="M14 12v6M11 15h6M50 54v6M47 57h6"/></g>`),
  paste: ic(`<g ${S}><rect x="8" y="34" width="48" height="10" rx="4"/><path d="M14 34v-6h10v6"/><path d="M36 28c4-6 12-6 14 0" /></g><ellipse cx="44" cy="26" rx="5" ry="3" fill="currentColor"/>`),
  front: ic(`<g ${S}><path d="M10 22c0-8 44-8 44 0v8c0 18-44 18-44 0z"/><path d="M21 22v14M32 22v16M43 22v14"/></g><circle cx="32" cy="30" r="5" fill="currentColor" opacity=".35"/>`),
  back: ic(`<g ${S}><path d="M10 22c0-8 44-8 44 0v8c0 18-44 18-44 0z"/><path d="M21 22v14M32 22v16M43 22v14"/><path d="M50 50a10 10 0 1 1-6-14" /></g>`),
  top: ic(`<g ${S}><path d="M14 30h36v16c0 10-36 10-36 0z"/><path d="M14 30c4-6 10-6 12 0 2-6 10-6 12 0 2-6 8-6 12 0"/><path d="M32 6v14M26 14l6 6 6-6"/></g>`),
  smile: ic(`<g ${S}><circle cx="32" cy="32" r="24"/><path d="M20 36c6 10 18 10 24 0"/><path d="M24 26v2M40 26v2"/><path d="M54 8l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>`),
  plate: ic(`<g ${S}><circle cx="32" cy="34" r="22"/><circle cx="32" cy="34" r="13"/><path d="M8 6v14c0 4 6 4 6 0V6M11 20v36M56 6c-6 2-6 14 0 16v34"/></g>`),
  rainbow: ic(`<g fill="none" stroke-width="5" stroke-linecap="round"><path d="M6 50a26 26 0 0 1 52 0" stroke="#E23B3B"/><path d="M13 50a19 19 0 0 1 38 0" stroke="#F28C28"/><path d="M20 50a12 12 0 0 1 24 0" stroke="#2E9E57"/><path d="M27 50a5 5 0 0 1 10 0" stroke="#7B57C8"/></g>`),
  count: ic(`<g ${S}><path d="M12 14v36M24 14v36M36 14v36M48 14v36M6 40l52-14"/></g>`),
  choice: ic(`<g ${S}><path d="M32 56V30M32 30L16 12M32 30l16-18M10 12h12v0M42 12h12"/><circle cx="32" cy="56" r="3"/></g>`),
  blanket: ic(`<g ${S}><rect x="6" y="20" width="52" height="30" rx="4"/><path d="M6 30h52M6 40h52M20 20v30M34 20v30M48 20v30" stroke-dasharray="3 4"/></g>`),
  face: ic(`<g ${S}><circle cx="20" cy="32" r="12"/><circle cx="44" cy="32" r="12"/><path d="M15 36c3 3 7 3 10 0M39 36c3 3 7 3 10 0"/></g>`),
  toy: ic(`<g ${S}><circle cx="32" cy="34" r="16"/><path d="M32 18v32M16 34h32"/><path d="M32 6v6"/></g>`),
  cuddle: ic(`<g ${S}><path d="M32 54C14 42 6 32 6 22a12 12 0 0 1 26-6 12 12 0 0 1 26 6c0 10-8 20-26 32z"/></g>`)
};
function guideHtml(g) {
  return `<article class="fl-guide" id="guide-${g.id}" style="--c:${col(g.c)}" aria-labelledby="g-${g.id}">
   <div class="fl-guide-top">${art(g.c)}<div><h3 id="g-${g.id}">${E(g.t)}</h3><p class="fl-meta">${E(g.when)}</p></div></div>
   ${actVideo(g)}
   <ol class="fl-steps">${g.steps.map((s, i) => `<li data-step="${i}"><span class="fl-stepn" aria-hidden="true">${i + 1}</span><span class="fl-ico">${ICONS[s[0]] || ''}</span><span class="fl-cap">${E(s[1])}</span></li>`).join('')}</ol>
   <p class="fl-vh" aria-live="polite" id="glive-${g.id}"></p>
   <div class="fl-acts"><button type="button" class="btn navy" data-fl="play" data-g="${g.id}">Play the steps</button><button type="button" class="btn soft" data-fl="print" data-target="guide-${g.id}">Print this guide</button></div></article>`;
}
V['see-how'] = () => `<div class="ffl">${hero('See how', 'See how: picture guides', 'For parents who would rather see it than read about it. Eight everyday routines, one picture per step. Press play to walk through the steps, or print a guide for the fridge.', 'bop')}
 ${sec('fl-guides', 'Picture guides', 'Routines in pictures', 'Each guide uses the same words your child hears in a Futures classroom, so home and school sound alike.',
  `<div class="fl-guidegrid">${GUIDES.map(guideHtml).join('')}</div>
   <p class="fl-note">Tooth-brushing amounts follow the ${ext('teeth', 'AAP')}; tummy time and sleep follow the ${ext('sleep', 'AAP safe sleep guidance')}; mealtime choice follows our Eat the Rainbow rule: food is never a reward or a punishment.</p>`)}</div>`;

// ---------------------------------------------------------------- #family-videos
// The shelf (gap fill 2026-10-07): every finished video, grouped by friend (VIDEOS.shelf). Talking videos get their captions and
// transcript (captions.js); silent loops are muted and loop; Bop's movement breaks use the shared actPlayer. Nothing autoplays.
const cardLink = id => !id ? '' : id === 'bop-at-home' ? ['#bop-at-home', 'Bop at Home']
  : ACTS.some(a => a.id === id) ? ['#activities/' + id, 'Activity card'] : GUIDES.some(g => g.id === id) ? ['#see-how', 'Picture guide'] : '';
const vidCap = (v, title) => { const l = cardLink(v.card);
  return `<b>${E(title)}</b><span class="fl-meta">${E(v.len)} &middot; story-world animation</span>${v.note ? `<span>${E(v.note)}</span>` : ''}${l ? `<a class="fl-vidlink" href="${l[0]}">${l[1]}: try it together &rarr;</a>` : ''}`; };
function shelfVid(v) {
  if (v.act) {
    const C = window.FFCaptions, A = C && ((C.BOP_ACTS && C.BOP_ACTS[v.act]) || (C.FRIEND_ACTS && C.FRIEND_ACTS[v.act])); if (!A) return '';
    return `<div class="fl-vid fl-vid-act">${actVideo({ vid: v.act, t: A.t })}<div class="fl-vidcap">${vidCap(v, A.t)}</div></div>`;
  }
  const C = window.FFCaptions, talk = C && C.has(v.src);
  return `<figure class="fl-vid${v.big ? ' fl-vid-big' : ''}${v.tall ? ' fl-vid-tall' : ''}"><video controls playsinline preload="none"${v.loop ? ' muted loop' : ''} poster="${v.poster}" aria-label="${E(v.t + ': story-world animation' + (v.loop ? ', no sound' : ''))}"><source src="${v.src}" type="video/mp4">${talk ? window.FFCaptions.tracks(v.src) : ''}</video>
    <figcaption class="fl-vidcap">${vidCap(v, v.t)}${talk ? C.transcript(v.src, v.t) : ''}</figcaption></figure>`;
}
const shelfCount = () => VIDEOS.shelf.reduce((n, g) => n + g.items.length, 0);
// The shelf sections, shared by #family-videos and #watch (o.pre: id prefix; o.talk: the welcome video's talk card under the first group).
function shelfSections(o = {}) {
  const pre = o.pre || 'fl-v-';
  return VIDEOS.shelf.map((g, i) => sec(pre + g.id, i === 0 ? 'Available now' : (g.k === 'all' ? 'All four friends' : FRIENDS[g.k].n + ' &middot; ' + FRIENDS[g.k].p), g.h, g.lede,
  `<div class="fl-vidshelf fl-vidshelf-${g.id}">${g.items.filter(v => !o.skip || v.src !== o.skip).map(shelfVid).join('')}</div>${i === 0 && o.talk !== false && window.FFTalk ? `<div class="fl-talk">${window.FFTalk.card('w0')}</div>` : ''}`, i % 2 ? 'band-paper' : '')).join('');
}
// One friend's videos (the #friends cards): their play-alongs first, then their loop.
const whoOf = v => { const C = window.FFCaptions || {}; return v.act ? ((C.FRIEND_ACTS && C.FRIEND_ACTS[v.act] && C.FRIEND_ACTS[v.act].who) || (C.BOP_ACTS && C.BOP_ACTS[v.act] ? 'bop' : null)) : (v.k || null); };
const vidRank = v => v.big ? 0 : v.act ? 1 : v.loop ? 3 : 2;   // headline video, play-alongs, moments, then the silent loop
const friendVids = k => VIDEOS.shelf.flatMap(g => g.items).filter(v => whoOf(v) === k).map((v, i) => [v, i]).sort((a, b) => vidRank(a[0]) - vidRank(b[0]) || a[1] - b[1]).map(x => x[0]);
// #watch (gap fill 2026-10-07): after the classroom player, the whole shelf of finished videos, grouped by friend, so the Watch page
// shows everything there is to watch (the episode library below stays the plan). Same players: preload none, posters only.
if (V.watch) { const w = V.watch; V.watch = (...a) => { const h = w(...a), at = h.indexOf('<section id="ffx-artwork"');
  const shelf = `<div class="ffl ffx-shelf">${shelfSections({ pre: 'ffx-v-', talk: false, skip: 'video/ff-intro-titled-16x9.mp4' })}</div>`;
  return at > 0 ? h.slice(0, at) + shelf + h.slice(at) : h + shelf; }; }
// #friends (gap fill 2026-10-07, owner: friends lead to their videos): right under the four friend cards, each friend's own videos,
// their play-alongs first and their hello loop last, with a link to everything they do at home. Same players (preload none).
if (V.friends) { const w = V.friends; V.friends = (...a) => { const h = w(...a), m = '<div class="grid g4">', at = h.indexOf(m), end = at > -1 ? h.indexOf('</section>', at) : -1;
  const go = { booker: ['#activities/booker', 'All of Booker\'s activities'], lumi: ['#activities/lumi', 'All of Lumi\'s activities'], zuri: ['#activities/zuri', 'All of Zuri\'s activities'], bop: ['#bop-at-home', 'Bop at Home'] };
  const band = `<section class="band-paper fl-friendvids" id="friends-videos" aria-labelledby="friends-videos-h"><div class="wrap ffl">
   <div class="head"><div class="eyebrow">Watch with the friends</div><h2 id="friends-videos-h">Every friend has videos to watch together</h2><p class="lede">Story-world animation to watch with a grown-up, then try it together. Every video is on <a href="#family-videos">Watch together</a>.</p></div>
   ${FK.map(k => { const vids = friendVids(k), main = vids.filter(v => !v.loop).slice(0, 3), rest = vids.length - main.length;
     return `<div class="fl-friendrow" style="--c:${col(k)}"><div class="fl-friendrow-hd">${art(k, 'fl-friendrow-art')}<div><h3>${FRIENDS[k].n}</h3><p class="fl-meta">${FRIENDS[k].p} &middot; ${FRIENDS[k].p2} &middot; ${vids.length} ${vids.length === 1 ? 'video' : 'videos'}</p><a class="fl-vidlink" href="${go[k][0]}">${go[k][1]} &rarr;</a>${rest > 0 ? ` <a class="fl-vidlink" href="#family-videos">More with ${FRIENDS[k].n} (${rest}) &rarr;</a>` : ''}</div></div>
      <div class="fl-vidshelf">${main.map(shelfVid).join('')}</div></div>`; }).join('')}</div></section>`;
  return end > -1 ? h.slice(0, end + 10) + band + h.slice(end + 10) : h + band; }; }
V['family-videos'] = () => `<div class="ffl">${hero('Watch', 'Watch together', `${shelfCount()} short videos with Booker, Lumi, Zuri and Bop, and what we are making next. Every video here is meant to be watched with a grown-up, then turned off for something hands-on.`, 'lumi')}
 ${shelfSections()}
 ${sec('fl-next', 'In production', 'Next on the shelf', 'More play-alongs with each friend are in production now.',
  `<ul class="fl-planned">${VIDEOS.planned.map(v => `<li style="--c:${col(v.k)}"><span class="fl-chip fl-chip-soft">In production</span><b>${E(v.t)}</b><span class="fl-meta">${E(v.who)}</span><span>${E(v.what)}</span></li>`).join('')}</ul>
   <div class="fl-card fl-noscreen"><h3>Prefer stories without a screen?</h3><p>Story Time has ${BOOKS.filter(b => b.status === 'full').length} full storybooks to read aloud, and the picture guides show routines step by step.</p><div class="fl-acts"><a class="btn navy" href="#story-time">Story Time</a><a class="btn soft" href="#see-how">Picture guides</a></div></div>`, 'band-paper')}
 ${sec('fl-screens', 'Small screens, big talk', 'How much screen time?', '',
  `<div class="fl-screengrid">
    <div class="fl-card"><h3>Under 2</h3><p>No screens except video chats with family. The AAP explains that babies under 18 months have a hard time learning from screens, and the WHO does not recommend screen time before age 2. Read, sing and play instead.</p></div>
    <div class="fl-card"><h3>Ages 2 to 5</h3><p>The WHO says no more than 1 hour a day, and less is better. Futures Friends suggests 30 minutes a day or less of all screens together, watched with a grown-up.</p></div>
    <div class="fl-card"><h3>In child care</h3><p>Futures Friends classrooms schedule at most 24 minutes of episodes a week for children 3 to 5, and none for children 2 and younger.</p></div></div>
   <p class="fl-note">Watch together, pause to ask "What happened?", and then turn it off and try the activity. The AAP's newest guidance (2026) puts watching together and choosing quality first, rather than a set number of minutes. Sources, checked 5 October 2026: ${ext('who')}; ${ext('aapScreen')} (2016); ${ext('aap2026')}; ${ext('aapCoview')}; ${ext('cfoc')}.</p>`)}</div>`;

// ---------------------------------------------------------------- #my-week
const CERTS = [
  ['booker', 'Brave Reader', 'for trying new words with a big breath and a brave heart'],
  ['lumi', 'Kindness Keeper', 'for noticing feelings and lending a hand'],
  ['zuri', 'Wonder Scientist', 'for asking questions and trying to find out'],
  ['bop', 'Super Mover', 'for moving your body and trying again'],
  ['booker', 'Book Club: 10 Books', 'for reading 10 books together']
];
const CLUB = [10, 25, 50, 100];
const C = { cert: 0, name: '' };
function planPrefs() { const p = store.get(KEY.plan, {}); return { band: p.band || '', friends: Array.isArray(p.friends) ? p.friends : FK.slice(), mins: p.mins || 10 }; }
function stickers() { const all = store.get(KEY.stickers, {}); const wk = isoDay(monday()); const cur = all && typeof all === 'object' && all[wk] ? all[wk] : {}; return { all, wk, cur }; }
function stickerCount(cur) { return FK.reduce((n, k) => n + (Array.isArray(cur[k]) ? cur[k].filter(Boolean).length : 0), 0); }
function addSticker(k, day) {
  const s = stickers(); const row = Array.isArray(s.cur[k]) ? s.cur[k].slice(0, 7) : [false, false, false, false, false, false, false];
  const d = day == null ? (new Date().getDay() + 6) % 7 : day;
  row[d] = day == null ? true : !row[d];
  s.cur[k] = row; const keep = {}; keep[s.wk] = s.cur;          // keep only this week: nothing piles up on the device
  return store.set(KEY.stickers, keep);
}
function planHtml() {
  const p = planPrefs();
  if (!p.band) return '<p class="fl-meta" id="flPlanOut">Pick an age above to see your week.</p>';
  const plan = buildPlan(p);
  const line = (lbl, a) => a ? `<li><span class="fl-slot" style="--c:${col(a.c)}">${lbl}</span><a href="#activities/${a.id}">${E(a.t)}</a> <span class="fl-meta">${mins(a.min)}</span></li>` : '';
  return `<div id="flPlanOut"><div class="fl-planhead"><h3>${band(plan.band).n} (${band(plan.band).age}): week of ${new Date(plan.week + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h3>
   <button type="button" class="btn soft" data-fl="print" data-target="flPlanOut">Print my week</button></div>
   <ol class="fl-plan">${plan.days.map(d => `<li class="${d.weekend ? 'fl-wkend' : ''}"><h4>${d.day}${d.weekend ? ' <span class="fl-meta">outside day</span>' : ''}</h4><ul>
    <li><span class="fl-slot" style="--c:var(--fl-booker)">Story</span><a href="${d.story.href}">${E(d.story.t)}</a> <span class="fl-meta">${E(d.story.how)}</span></li>
    ${line('Do', d.doIt)}${line('Move', d.move)}${line('Calm', d.calm)}</ul></li>`).join('')}</ol>
   <p class="fl-meta">About ${plan.mins + 13} minutes a day, screen-free. Skip anything, swap anything, repeat favorites. A new plan appears every Monday.</p></div>`;
}
function chartHtml() {
  const s = stickers(), n = stickerCount(s.cur);
  return `<div id="flChart"><div class="fl-chartwrap"><table class="fl-chart"><caption class="fl-vh">Sticker chart for the week of ${s.wk}</caption>
   <thead><tr><th scope="col">Friend</th>${DAYS.map(d => `<th scope="col">${d.slice(0, 3)}</th>`).join('')}</tr></thead>
   <tbody>${FK.map(k => `<tr style="--c:${col(k)}"><th scope="row">${FRIENDS[k].n}<span class="fl-meta">${FRIENDS[k].p}</span></th>${DAYS.map((d, i) => { const on = Array.isArray(s.cur[k]) && !!s.cur[k][i]; return `<td><button type="button" class="fl-stk" data-fl="stk" data-k="${k}" data-d="${i}" aria-pressed="${on}" aria-label="${FRIENDS[k].n}, ${d}: ${on ? 'sticker added' : 'no sticker yet'}">${on ? `<img src="${img(k)}" alt="">` : ''}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
   <p class="fl-meta" role="status">${n ? `${n} ${n === 1 ? 'sticker' : 'stickers'} this week. Every sticker means "we tried it."` : 'Tap a box to add a sticker when you try something together.'}</p></div>`;
}
function clubHtml() {
  const n = Math.max(0, Math.floor(+store.get(KEY.books, 0) || 0));
  const next = CLUB.find(c => c > n);
  return `<div id="flClub" class="fl-card fl-club"><h3>Booker's Book Club</h3><p class="fl-bignum">${n}<small> ${n === 1 ? 'book' : 'books'} read together</small></p>
   <div class="fl-acts"><button type="button" class="btn gold" data-fl="bookread">+1 book</button><button type="button" class="btn soft" data-fl="bookundo" ${n ? '' : 'disabled'}>Undo</button></div>
   <ul class="fl-badges">${CLUB.map(c => `<li class="${n >= c ? 'on' : ''}">${c}</li>`).join('')}</ul>
   <p class="fl-meta">${next ? `${next - n} more to the ${next}-book badge.` : 'Every badge earned. Keep reading!'} Rereading a favorite counts.</p></div>`;
}
function certHtml() {
  const c = CERTS[C.cert], k = c[0];
  return `<div id="flCert" class="fl-cert" style="--c:${col(k)}"><div class="fl-cert-in">
   <img class="fl-cert-logo ff-plush-wm" src="img/brand/ff-plush-wordmark-320.webp" srcset="img/brand/ff-plush-wordmark-320.webp 320w, img/brand/ff-plush-wordmark-640.webp 640w" sizes="140px" alt="Futures Friends" width="140" height="65">
   <p class="fl-cert-k">Certificate</p><h3>${E(c[1])}</h3><p>This certificate goes to</p>
   <p class="fl-cert-name">${C.name ? E(C.name) : '<span class="fl-line">&nbsp;</span>'}</p>
   <p>${E(c[2])}.</p>${art(k, 'fl-cert-art')}<p class="fl-cert-from">With love from ${FRIENDS[k].n} and the Futures Friends &middot; ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div></div>`;
}
V['my-week'] = () => {
  const p = planPrefs();
  return `<div class="ffl">${hero('My Week', 'My Week', 'Make a plan for your child\'s age, keep a sticker chart, count your books and print a certificate. Everything is saved only on this device, with no account.', 'booker', `<button type="button" class="btn gold" data-anchor="fl-plan">Make my plan</button><button type="button" class="btn ghost" data-anchor="fl-stickers">Sticker chart</button>`)}
  ${sec('fl-plan', 'Weekly plan', 'A plan for this week', 'Pick an age and the friends your child loves. You get one story, one thing to do, one move and one calm moment for each day.',
   `<form class="fl-planform" id="flPlanForm"><fieldset><legend>Age</legend><div class="fl-radios">${BANDS.map(b => `<label><input type="radio" name="band" value="${b.id}" ${p.band === b.id ? 'checked' : ''}><span><b>${b.n}</b> ${b.age}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>Friends to focus on</legend><div class="fl-radios">${FK.map(k => `<label style="--c:${col(k)}"><input type="checkbox" name="friends" value="${k}" ${p.friends.includes(k) ? 'checked' : ''}><span><b>${FRIENDS[k].n}</b> ${FRIENDS[k].t}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>Time for the main activity</legend><div class="fl-radios fl-row">${[5, 10, 15].map(m => `<label><input type="radio" name="mins" value="${m}" ${+p.mins === m ? 'checked' : ''}><span><b>${m} min</b></span></label>`).join('')}</div></fieldset></form>
    ${planHtml()}`)}
  ${sec('fl-stickers', 'Sticker chart', 'Our week', 'One row for each friend. Add a sticker when you try something together. There are no scores and no comparing: trying is the win.', `${chartHtml()}<div class="fl-acts"><button type="button" class="btn soft" data-fl="print" data-target="flChart">Print this chart</button><a class="btn soft" href="printables/futures-at-home-sticker-chart.pdf" download>Blank chart (PDF)</a></div>`, 'band-paper')}
  ${sec('fl-club', 'Book club', 'Count the books you share', 'Babies count too: pointing at pictures together is reading.', clubHtml())}
  ${sec('fl-certs', 'Certificates', 'Print a certificate', 'Pick one, type your child\'s first name and print. The name stays on this screen only. It is never saved or sent.',
   `<div class="fl-certpick"><div class="seg fl-seg" role="group" aria-label="Certificate">${CERTS.map((c, i) => `<button type="button" data-fl="cert" data-i="${i}" aria-pressed="${C.cert === i}">${E(c[1])}</button>`).join('')}</div>
    <label class="fl-namefield" for="flName">Child's first name (optional)<input id="flName" class="i" maxlength="24" autocomplete="off" value="${E(C.name)}"></label></div>
    <div id="flCertWrap">${certHtml()}</div><div class="fl-acts"><button type="button" class="btn gold" data-fl="print" data-target="flCert">Print certificate</button><a class="btn soft" href="printables/futures-at-home-certificates.pdf" download>All four as a PDF</a></div>`, 'band-paper')}
  ${sec('fl-mine', 'Your data', 'Saved on this device only', '',
   `${privacyNote}<button type="button" class="btn soft" data-fl="erase">Erase everything saved here</button>`)}</div>`;
};

// ---------------------------------------------------------------- events
function refresh(id, html) { const el = document.getElementById(id); if (el) el.outerHTML = html; }
function printOnly(id) {
  const t = document.getElementById(id); if (!t) return;
  if (t.tagName === 'DETAILS') t.open = true;
  document.body.classList.add('fl-printing'); t.classList.add('fl-print-me');
  const done = () => { document.body.classList.remove('fl-printing'); t.classList.remove('fl-print-me'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  try { window.print(); } catch (e) { done(); }
}
const timers = {};
function play(id) {
  const g = document.getElementById('guide-' + id), def = GUIDES.find(x => x.id === id); if (!g || !def) return;
  clearInterval(timers[id]);
  const items = g.querySelectorAll('.fl-steps li'), live = document.getElementById('glive-' + id), btn = g.querySelector('[data-fl="play"]');
  let i = 0;
  const show = () => { items.forEach((li, j) => li.classList.toggle('fl-on', j === i)); if (live) live.textContent = `Step ${i + 1}: ${def.steps[i][1]}`; };
  show(); if (btn) btn.textContent = 'Playing...';
  timers[id] = setInterval(() => { i++; if (i >= items.length) { clearInterval(timers[id]); items.forEach(li => li.classList.remove('fl-on')); if (btn) btn.textContent = 'Play again'; if (live) live.textContent = 'Done.'; return; } show(); }, 2600);
}
document.addEventListener('click', async e => {
  const t = e.target.closest && e.target.closest('[data-fl]');
  if (!t) { const w = e.target.closest && e.target.closest('#flStory .fl-w'); if (w && R.point) mark(+w.dataset.wi); return; }
  const a = t.dataset.fl;
  if (a === 'next') return turn(1);
  if (a === 'prev') return turn(-1);
  if (a === 'size') { R.size = Math.min(SIZES.length - 1, Math.max(0, R.size + +t.dataset.d)); const r = document.getElementById('flReader'); if (r) r.style.setProperty('--fl-size', SIZES[R.size][1]); say(`Words: ${SIZES[R.size][0]}.`); return; }
  if (a === 'point') { R.point = !R.point; redrawReader(); if (R.point) mark(0); say(R.point ? 'Point and read is on. Press Space or Next word to move the highlight.' : 'Point and read is off.'); return; }
  if (a === 'nextword') { const n = document.querySelectorAll('#flStory .fl-w').length; return mark(R.wi + 1 >= n ? 0 : R.wi + 1); }
  if (a === 'speak') return speak();
  if (a === 'filter') { A[t.dataset.f] = t.dataset.v; t.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === t ? 'true' : 'false')); const l = document.getElementById('flActList'); if (l) l.innerHTML = actList(); return; }
  if (a === 'print') return printOnly(t.dataset.target);
  if (a === 'play') return play(t.dataset.g);
  if (a === 'share') {
    const url = location.href.split('#')[0] + t.dataset.href;
    try { await navigator.clipboard.writeText(url); toast('Link copied. Paste it in a text to family or a teacher.'); } catch (err) { toast(url); }
    return;
  }
  if (a === 'sticker') { const ok = addSticker(t.dataset.k); toast(ok ? `Sticker added for ${FRIENDS[t.dataset.k].n} today. See it on My Week.` : 'This browser is not saving data right now, so the sticker could not be kept.'); return; }
  if (a === 'stk') { addSticker(t.dataset.k, +t.dataset.d); refresh('flChart', chartHtml()); const b = document.querySelector(`#flChart [data-k="${t.dataset.k}"][data-d="${t.dataset.d}"]`); if (b) b.focus(); return; }
  if (a === 'bookread' || a === 'bookundo') {
    const n = Math.max(0, Math.floor(+store.get(KEY.books, 0) || 0) + (a === 'bookread' ? 1 : -1));
    const ok = store.set(KEY.books, n); refresh('flClub', clubHtml());
    toast(!ok ? 'This browser is not saving data right now.' : (a === 'bookread' ? (CLUB.includes(n) ? `${n} books! Print your Book Club certificate on My Week.` : `Book counted: ${n} in Booker's Book Club.`) : 'Removed one book.'));
    return;
  }
  if (a === 'cert') { C.cert = +t.dataset.i; t.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === t ? 'true' : 'false')); refresh('flCert', certHtml()); return; }
  if (a === 'erase') { Object.values(KEY).forEach(store.del); C.name = ''; if (typeof render === 'function') render(); toast('Everything saved by Futures at Home on this device is erased.'); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t && t.id === 'flName') { C.name = t.value.slice(0, 24); refresh('flCert', certHtml()); return; }
});
document.addEventListener('change', e => {
  const f = e.target && e.target.form; if (!f || f.id !== 'flPlanForm') return;
  const fd = new FormData(f);
  const prefs = { band: fd.get('band') || '', friends: fd.getAll('friends'), mins: +fd.get('mins') || 10 };
  store.set(KEY.plan, prefs);
  const out = document.getElementById('flPlanOut'); if (out) out.outerHTML = planHtml();
});
document.addEventListener('keydown', e => {
  if (!document.getElementById('flReader') || e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = (e.target && e.target.tagName) || ''; if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); turn(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
  else if (e.key === ' ' && R.point && !(e.target && e.target.closest && e.target.closest('button,a'))) { e.preventDefault(); const n = document.querySelectorAll('#flStory .fl-w').length; mark(R.wi + 1 >= n ? 0 : R.wi + 1); }
});
let tx = null;
document.addEventListener('touchstart', e => { if (e.target.closest && e.target.closest('#flStage')) tx = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 60) turn(dx < 0 ? 1 : -1); }, { passive: true });

window.FFhooks = window.FFhooks || [];
window.FFhooks.push(function (v) {
  if (v !== 'story-time') stopSpeech();
  if (v === 'story-time') setupVoice();
  if (v !== 'see-how') Object.keys(timers).forEach(k => clearInterval(timers[k]));
});

window.FFFamilyUI = { shelfSections, shelfVid, friendVids, friendBook, buildPlan, words, wordAt, weekNo, monday, store, KEY, addSticker, stickers, stickerCount, ICONS, CERTS, R };
})();
