// W11 (owner 2026-10-07: "a lot of videos from each character that need to be created"): Booker, Lumi and Zuri (and Bop's outdoor
// moves) get titled play-along videos like the six Bop at Home videos. One registry (captions.js FRIEND_ACTS), the same player
// (actPlayer), each video on its Futures at Home card or picture guide, and every friend's own videos on #activities/<friend>.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { site, read } = require('./site-vm');

const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'captions.js'));
const F = require(path.join(ROOT, 'family-library-data.js'));
const NAMES = { bop: 'Bop', booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri' };
const SLUGS = Object.keys(C.FRIEND_ACTS);

test('every friend video: file, poster and captions in video/, registered, with a title-to-end-card transcript', () => {
  for (const s of SLUGS) {
    const v = C.FRIEND_ACTS[s];
    assert.ok(NAMES[v.who], s + ' has a friend'); assert.ok(v.t, s + ' has a title');
    assert.match(v.src, new RegExp(`^video/act-${s}\\.mp4\\?v=\\d+$`)); assert.match(v.poster, new RegExp(`^video/act-${s}-poster\\.jpg\\?v=\\d+$`));
    for (const f of [`video/act-${s}.mp4`, `video/act-${s}-poster.jpg`, `video/act-${s}.en.vtt`]) assert.ok(fs.statSync(path.join(ROOT, f)).size > 500, f);
    assert.match(read(`video/act-${s}.en.vtt`), /^WEBVTT/);
    assert.ok(C.has(v.src), s + ' has captions');
    assert.match(C.CAPS[`video/act-${s}.mp4`].transcript, new RegExp(`^\\[Title card\\] Futures Friends\\. [\\s\\S]+\\n\\n${NAMES[v.who]}: [\\s\\S]+\\[End card\\] `), s);
    assert.ok(!(s in C.BOP_ACTS), s + ' is not also a Bop at Home video');
  }
});

test('the same player: no autoplay, captions on, the leading friend named honestly as story-world animation', () => {
  for (const s of SLUGS) {
    const v = C.FRIEND_ACTS[s], html = C.actPlayer(s, v.t);
    assert.match(html, /<video controls playsinline preload="none" width="1280" height="720"/);
    assert.doesNotMatch(html, /<video[^>]*\s(autoplay|muted|loop)[\s>=]/);
    assert.match(html, new RegExp(`Watch ${NAMES[v.who]} do it with you &middot; story-world animation`));
    assert.match(html, new RegExp(`aria-label="${NAMES[v.who]} leads `));
    assert.match(html, /<track kind="captions" srclang="en" label="English" src="video\/act-[a-z-]+\.en\.vtt" default>/);
  }
  // the Bop videos keep their exact player
  assert.match(C.actPlayer('trunk-reach', 'Trunk Reach'), /data-bop-act="trunk-reach"[\s\S]*Watch Bop do it with you/);
});

test('each friend video sits on at least one real activity card or picture guide of that friend', () => {
  for (const s of SLUGS) {
    const on = F.ACTS.filter(a => a.vid === s).concat(F.GUIDES.filter(g => g.vid === s));
    assert.ok(on.length >= 1, s + ' is on a card');
    for (const a of on) assert.equal(a.c, C.FRIEND_ACTS[s].who, `${a.id}: the card's friend leads the video`);
  }
  // every vid on a card is a real registered video
  for (const a of F.ACTS.concat(F.GUIDES)) if (a.vid) assert.ok(a.vid in C.BOP_ACTS || a.vid in C.FRIEND_ACTS, a.id + ' -> ' + a.vid);
});

test("#activities/<friend>: the friend's video section lists exactly that friend's videos", () => {
  const S = site();
  for (const who of ['booker', 'lumi', 'zuri']) {
    const html = S.render('activities', who), mine = C.friendActs(who);
    if (!mine.length) { assert.doesNotMatch(html, /id="fl-friendvids"/, who + ': no empty video section'); continue; }
    assert.match(html, new RegExp(`id="watch-${who}"`));
    for (const s of mine) assert.ok(html.includes(`data-friend-act="${s}"`), `${who} shows ${s}`);
    for (const s of SLUGS.filter(x => C.FRIEND_ACTS[x].who !== who)) {
      const sec = html.slice(html.indexOf('id="fl-friendvids"'), html.indexOf('id="fl-lib"'));
      assert.ok(!sec.includes(`data-friend-act="${s}"`), `${who}'s section does not show ${s}`);
    }
  }
});

test('one helper: the pages never write their own <video> markup for these clips', () => {
  for (const f of ['whole-child.js', 'family-library.js', 'family-library-data.js']) assert.doesNotMatch(read(f), /video\/act-/, f);
});
