// "Talk about it" cards (talk-cards.js): one card for every episode, clip and episode poster, following the Bible v3.0 slate (X10).
const test = require('node:test');
const assert = require('node:assert/strict');
const { site, read, text } = require('./site-vm');

const T = require('../talk-cards.js');
// Series & Curriculum Bible v3.0, s.6.2 Season at a Glance.
const BIBLE = [['101', 'The Wobbly Welcome Tower', 'booker'], ['102', 'A Spot for Everyone', 'lumi'], ['103', 'What Melts?', 'zuri'], ['104', 'The Cleanup Beat', 'bop'],
  ['105', 'The Missing Rhyme', 'booker'], ['106', 'The Feelings Forecast', 'lumi'], ['107', 'Seed Surprise', 'zuri'], ['108', 'Move Like Me', 'bop'],
  ['109', 'The Rainbow Snack Adventure', 'all'], ['110', 'The Brave Question', 'booker'], ['111', 'Two Friends, One Toy', 'lumi'], ['112', 'Where Did My Shadow Go?', 'zuri'],
  ['113', 'The Brighter Together Parade', 'all']];
const PILLS = { booker: 'LEARN SMILE', lumi: 'BELONG RESET', zuri: 'EXPLORE NOURISH', bop: 'MOVE OUTSIDE' };
const cardOf = (html, code) => { const i = html.indexOf(`id="tk-${code}"`); return i < 0 ? '' : html.slice(i, html.indexOf('</article>', i)); };

test('the episode list is the Bible v3.0 Season One slate: 13 episodes, FF101 to FF113, with their leads', () => {
  assert.deepEqual(T.SLATE.map(e => [e.code, e.title, e.k]), BIBLE);
  assert.deepEqual(T.SLATE.map(e => e.wk), BIBLE.map((_, i) => i + 1));
});

test('every card has three questions (before, during, after), one feeling word, one try-at-home and the right pillars', () => {
  for (const c of T.ALL) {
    for (const f of ['title', 'lesson', 'before', 'during', 'after', 'home']) assert.ok(c[f] && c[f].length > 8, `${c.code} ${f}`);
    assert.ok(/^[a-z]+$/.test(c.feel[0]) && c.feel[1].length > 10, `${c.code} feeling word`);
    const html = T.card(c), t = text(html);
    assert.match(html, /<ol class="tk-qs"><li><b>Before<\/b>[\s\S]*?<li><b>(During|While you look)<\/b>[\s\S]*?<li><b>After<\/b>/, c.code);
    assert.match(t, /Feeling word/); assert.match(t, /Try at home/);
    if (c.k !== 'all') assert.ok(t.includes(PILLS[c.k]), `${c.code} pillars ${PILLS[c.k]}`);
    assert.match(html, /data-tk-print="/, `${c.code} is printable`);
  }
  for (const c of T.SLATE.filter(e => e.k === 'bop')) assert.match(T.card(c), /Move Your Body, Grow Your Mind/);
  for (const c of T.SLATE) assert.match(text(T.card(c)), /Episode in development: not made yet/, `${c.code} says it is not made yet`);
  const all = T.ALL.map(c => T.card(c)).join('');
  assert.doesNotMatch(all, /Happy Doer|\bPLAY\b|undefined|NaN/);
});

test('#watch: every episode in the library and the sample clip and posters have a talk card; the research is cited', () => {
  const html = site().render('watch');
  for (const [code, title] of BIBLE) {
    assert.ok(cardOf(html, code), `card for FF${code}`);
    assert.ok(html.includes(`href="#talk/${code}"`), `episode FF${code} links its card`);
    assert.ok(html.includes(title.replace(/'/g, '&#39;')) || html.includes(title), title);
  }
  for (const code of ['w0', 'p-booker', 'p-bop', 'p-lumi']) assert.ok(cardOf(html, code), code);
  assert.equal((html.match(/class="ffx-mcard ep"/g) || []).length, 13, 'the rail shows the 13-episode slate');
  assert.doesNotMatch(text(html), /24 episodes|Episodes 13 to 24/);
  assert.ok(html.includes(T.SRC.tiger[0]), 'Daniel Tiger study cited');
  assert.ok(html.includes(T.SRC.aap[0]), 'AAP co-viewing guidance cited');
  assert.match(html, /data-tk-print="all"/);
});

test('#friends lists the slate with a card for every episode; #family-videos has a card for its clip', () => {
  const c = site();
  const fr = c.render('friends');
  for (const [code] of BIBLE) { assert.ok(fr.includes(`href="#talk/${code}"`), code); assert.ok(cardOf(fr, code), `inline card ${code}`); }
  assert.match(fr, /Season One: 13 planned episodes/);
  assert.doesNotMatch(text(fr), /planned at 24 episodes/);
  const fv = c.render('family-videos');
  assert.ok(cardOf(fv, 'w0'), 'clip card on #family-videos');
});

test('#talk shows every card with print buttons; #talk/<code> shows one; the Academy screen-use lesson points to the cards', () => {
  const c = site();
  const all = c.render('talk');
  for (const x of T.ALL) assert.ok(cardOf(all, x.code), x.code);
  assert.match(all, /Print all 13 cards/);
  const one = c.render('talk', '106');
  assert.equal((one.match(/class="tk-card"/g) || []).length, 1);
  assert.match(one, /The Feelings Forecast/);
  assert.equal((one.match(/<h1[ >]/g) || []).length, 1);
  const lesson = c.render('academy', 'F-108');
  assert.match(lesson, /href="#talk"/);
  const css = read('talk-cards.css');
  assert.match(css, /@media print\{[\s\S]*body\.tk-printing \.tk-print-me/);
  assert.match(read('route-meta.js'), /talk: \['Talk about it cards'/);
});

test('talk-cards.js loads after views.js and before features.js, with cache-busting versions', () => {
  const html = read('index.html');
  assert.match(html, /<script src="talk-cards\.js\?v=\d+"><\/script>\s*<script src="features\.js\?v=\d+"><\/script>/);
  assert.ok(html.indexOf('views.js?v=') < html.indexOf('talk-cards.js?v='));
  assert.match(html, /<link rel="stylesheet" href="talk-cards\.css\?v=\d+">/);
});
