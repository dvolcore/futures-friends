// Captions (captions.js, checklist D156): every site player can carry a WebVTT track and a transcript, and nothing claims
// captions that do not exist.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { site, read, text, ROOT } = require('./site-vm');

const C = require('../captions.js');
const TRACK = /<track kind="captions" srclang="en" label="English" src="video\/test\.en\.vtt" default>/;
const withVtt = () => site({ before: { 'captions.js': ctx => {
  ctx.FFCaptions.CAPS['video/ff-intro-titled-16x9.mp4'] = { vtt: 'video/test.en.vtt', transcript: 'Hello, friends.\n\nThis is a test transcript.' };
  ctx.FFCaptions.CAPS['video/academy-welcome.mp4'] = { vtt: 'video/test.en.vtt', transcript: 'Welcome to the Academy test transcript.' };
} } });

test('no fake captions: every registered caption file exists, and no .vtt sits in video/ unregistered', () => {
  const vtts = fs.readdirSync(path.join(ROOT, 'video')).filter(f => /\.vtt$/i.test(f));
  // Spanish subtitle tracks (DRAFT, owner 2026-10-07) are registered in captions-es.js (window.FFCaptionsES).
  const sb = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'captions-es.js'), 'utf8'), Object.assign(sb, { window: sb }));
  const registered = Object.values(C.CAPS).concat(Object.values(sb.FFCaptionsES || {})).filter(e => e.vtt).map(e => e.vtt);
  for (const v of registered) assert.ok(fs.existsSync(path.join(ROOT, v)), v);
  for (const v of vtts) assert.ok(registered.includes('video/' + v), `${v} is not registered`);
});

test('clips marked silent really have no sound track (MP4 handler boxes: video only)', () => {
  for (const [src, e] of Object.entries(C.CAPS)) {
    const b = fs.readFileSync(path.join(ROOT, src)), handlers = [];
    for (let i = b.indexOf('hdlr'); i >= 0; i = b.indexOf('hdlr', i + 1)) handlers.push(b.slice(i + 12, i + 16).toString('latin1'));
    assert.ok(handlers.includes('vide'), src);
    if (e.silent) assert.ok(!handlers.includes('soun'), `${src} is marked silent but has an audio track`);
  }
});

test('today: the Watch player and the Watch together shelf play the captioned welcome video (gap fill 2026-10-07: the placeholder clip is retired); the Academy sample lesson (W10) carries its real captions and transcript', () => {
  const c = site();
  for (const [route, a] of [['watch'], ['family-videos']]) {
    const html = c.render(route, a);
    assert.match(html, /<track kind="captions" srclang="en" label="English" src="video\/ff-intro-titled\.en\.vtt" default>/, `${route} ${a || ''}`);
    assert.match(html, /<details class="ffcap-tr"><summary>Read the transcript/, `${route} ${a || ''}`);
    assert.doesNotMatch(html, /episode-sample|Captions coming with the final video|placeholder clip/, `${route} ${a || ''}`);
  }
  for (const [route, a] of [['academy'], ['academy', 'F-101']]) {
    const html = c.render(route, a);
    assert.match(html, /<track kind="captions" srclang="en" label="English" src="video\/academy-welcome\.en\.vtt" default>/, `${route} ${a || ''}`);
    assert.match(html, /<details class="ffcap-tr"><summary>Read the transcript/, `${route} ${a || ''}`);
    assert.doesNotMatch(html, /Captions coming with the final video|placeholder clip/, `${route} ${a || ''}`);
  }
  assert.equal(C.note('video/ff-logo-reveal-navy.mp4'), '', 'the finished, silent logo film needs no "coming" note');
});

test('W10: the Academy sample lesson captions are the words spoken, with speaker names, and the transcript says who is a story-world character', () => {
  const e = C.CAPS['video/academy-welcome.mp4'];
  assert.ok(e && !e.silent && !e.placeholder);
  const vtt = read('video/academy-welcome.en.vtt');
  assert.match(vtt, /^WEBVTT/);
  for (const line of ["<v Ms. June>Ms. June: Welcome to the Futures Friends Training Academy.", "<v Booker>Booker: Hi! I'm Booker. I love to learn, even when it's tricky!",
    "<v Ms. June>Ms. June: Booker owns Learn and Smile.", "<v Bop>Bop: Ready? Bop and go!", "<v Ms. June>Ms. June: Small steps, big stories."]) assert.ok(vtt.includes(line), line);
  assert.match(e.transcript, /I'm Ms\. June, a teacher in our story world\./);
  assert.match(e.transcript, /no course counts towards required training hours until it's approved/);
  assert.match(e.transcript, /Story-world characters\. Episodes and courses are in development\./);
});

test('when a .vtt exists, every site player gets a default English captions track and a transcript toggle', () => {
  const c = withVtt();
  for (const [route, a] of [['watch'], ['academy'], ['academy', 'F-101'], ['family-videos']]) {
    const html = c.render(route, a);
    assert.match(html, TRACK, `${route} ${a || ''}`);
    assert.match(html, /<details class="ffcap-tr"><summary>Read the transcript/, `${route} ${a || ''}`);
    assert.doesNotMatch(html, /Captions coming with the final video/, `${route} ${a || ''}`);
  }
  assert.match(c.FFCaptions.tracks('video/ff-intro-titled-16x9.mp4?v=2'), TRACK, 'query strings do not hide a registered file');
  assert.match(c.FFCaptions.transcript('video/ff-intro-titled-16x9.mp4'), /<p>Hello, friends\.<\/p><p>This is a test transcript\.<\/p>/);
  assert.equal(c.FFCaptions.tracks('video/unknown.mp4'), '');
});

test('every <video> in the site code is wired for captions (decorative muted hero loop excepted)', () => {
  const files = fs.readdirSync(ROOT).filter(f => /\.js$/.test(f) && !/^hub-config\.local/.test(f));
  for (const f of files) {
    const s = read(f);
    const videos = (s.match(/<video\b/g) || []).length + (s.match(/createElement\('video'\)/g) || []).length;
    if (!videos) continue;
    if (f === 'views.js') { assert.match(s, /<video class="art" src="video\/hero-loop\.mp4"[^>]*autoplay muted loop/, 'the only views.js video is the muted decorative loop'); continue; }
    assert.match(s, /FFCaptions\.tracks|capTrack\(|<track kind=.captions.|kind = 'captions'/, `${f} has a <video> with no caption wiring`);
  }
  assert.match(read('academy-lms.js'), /embedFor\(l\.video_url, l\.captions_url\)/);
  assert.match(read('premium.js'), /FFCaptions\.tracks\('video\/academy-welcome\.mp4'\)/);
  assert.match(read('brand-reveal.js'), /FFCaptions\.tracks\('video\/ff-logo-reveal-navy\.mp4'\)/);
});

test('no copy claims captions that do not exist', () => {
  const files = ['views.js', 'features.js', 'premium.js', 'family-library.js', 'family-library-data.js', 'talk-cards.js', 'pricing-all-in.js', 'brand-reveal.js', 'index.html'];
  const copy = files.map(read).join('\n');
  assert.doesNotMatch(copy, /captions on\b|captioned|(with|has|have|includes) (closed )?captions(?! (are|is) planned)/i);
  assert.match(read('index.html'), /<script src="data\.js\?v=\d+"><\/script>\s*<script src="captions\.js\?v=\d+"><\/script>/);
});
