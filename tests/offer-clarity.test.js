// Offer clarity (external review, 2026-10-07): #membership and #brand-kit render; every "month" row carries one honest status that
// matches the release manifest when it names an asset; the support promise reads the coordinator-call cadence from the manifest
// (so it can never contradict #pricing); the enroll page shows owner slots instead of invented facts or people; the daily schedule no
// longer describes unfinished tablet/app/episode features as everyday routine; the faith page states ages 2 to 5 and links the
// pack-away layout; compliance language distinguishes Reminder / Advisory warning / Enforced restriction; Bop is purple.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { site: baseSite, read, text } = require('./site-vm');

function site() {
  const c = baseSite();
  for (const f of ['offer-clarity.js']) vm.runInContext(read(f), c, { filename: f });
  return c;
}
const ids = html => [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);

test('#membership and #brand-kit render one h1, unique ids and no template leaks', () => {
  const c = site();
  for (const r of ['membership', 'brand-kit']) {
    const html = c.render(r);
    assert.equal((html.match(/<h1/g) || []).length, 1, r);
    const list = ids(html); assert.equal(new Set(list).size, list.length, r + ' has duplicate ids');
    assert.doesNotMatch(html, /undefined|\$\{|NaN|\[object/, r);
  }
});

test('every month row has exactly one status, and manifest assets decide it', () => {
  const c = site(), O = c.window.FFOffer, R = c.window.FFReleaseData;
  const map = { available_now: 'now', in_development: 'pilot', coming_later: 'planned' };
  for (const g of O.MONTH) for (const r of g.rows) {
    const s = O.statusOf(r);
    assert.ok(['now', 'pilot', 'planned'].includes(s), r.t);
    if (r.asset) { assert.ok(R.assets[r.asset], 'unknown asset ' + r.asset); assert.equal(s, map[R.assets[r.asset].availability], r.t); }
  }
  const html = c.render('membership');
  assert.equal((html.match(/data-oc-row/g) || []).length, O.MONTH.reduce((n, g) => n + g.rows.length, 0));
  for (const h of ['Classroom program', 'Staff support', 'Family connection', 'Enrollment marketing', 'Director support', 'Continuing improvement']) assert.match(html, new RegExp(h));
});

test('the support promise uses the manifest call cadence (no contradiction with #pricing) and is marked proposed', () => {
  const c = site(), R = c.window.FFReleaseData, t = text(c.render('membership'));
  for (const id of ['home', 'starter', 'complete']) { const it = R.packages[id].items.find(i => i[1] === 'service-coordinator'); assert.ok(t.includes(it[0]), id); }
  assert.match(t, /one business day/); assert.match(t, /Proposed, owner to confirm/);
  assert.match(t, /Arrives once/); assert.match(t, /Renews every month/); assert.match(t, /Costs extra/); assert.match(t, /multi-site quote/);
});

test('program pages and pricing link to #membership; the brand kit is linked from membership', () => {
  const c = site();
  for (const r of ['for-home', 'for-faith', 'pricing']) assert.match(c.render(r), /href="#membership"/, r);
  assert.match(c.render('membership'), /href="#brand-kit"/);
});

test('#enroll: owner slots, no invented staff, Ms. June labelled, honest daily schedule, parent hooks', () => {
  const c = site(), html = c.render('enroll'), t = text(html);
  assert.match(t, /Owner to provide/); assert.match(t, /Openings by room/); assert.match(t, /Registration fee/);
  assert.match(t, /Who will greet your child at the door/);
  assert.match(t, /What a day looks like/);
  assert.doesNotMatch(t, /Families sign in on the tablet/);
  assert.doesNotMatch(t, /on episode days, one 3 to 6 minute episode/);
  assert.match(t, /Tablet sign-in comes with the app pilot/);
  for (const p of c.window.FFOffer.FLC_FACTS.team) assert.equal(p.name, null, 'no staff name until the owner provides one');
  assert.doesNotMatch(html, /href="sms:/, 'no text link until the owner confirms the line takes texts');
});

test('#for-faith: three versions, ages 2 to 5 and not a nursery, volunteers, pack-away layout link, purchasing approval', () => {
  const t = text(site().render('for-faith')), html = site().render('for-faith');
  for (const s of ['Licensed weekday child care', 'Church preschool', 'Sunday or occasional', 'ages 2 to 5', 'not an infant or toddler nursery', 'Rotating volunteers', 'pack-away', 'Purchasing approval', 'Your own traditions']) assert.ok(t.includes(s), s);
  assert.match(html, /href="#room-kit"/);
});

test('#support: hours (proposed), urgent route, kinds of help, launch sequence, replacement staff, church volunteers', () => {
  const t = text(site().render('support'));
  for (const s of ['Support hours', '8:00 AM to 5:00 PM Central', 'Something urgent', 'Technical help', 'Classroom coaching', 'Extra consulting', 'Staff orientation', 'First classroom use', 'Family introduction', '30-day review', 'When a teacher leaves', 'Church volunteers', 'one business day']) assert.ok(t.includes(s), s);
});

test('compliance levels: three distinct labels, and the portals use them', () => {
  const O = site().window.FFOffer;
  const l = text(O.legend());
  for (const s of ['Reminder', 'Advisory warning', 'Enforced restriction']) assert.ok(l.includes(s), s);
  assert.match(read('director-due.js'), /FFOffer\.lvl\('enforced'\)/);
  assert.match(read('director-due.js'), /FFOffer\.lvl\('advisory'\)/);
  assert.match(read('demo-portal.js'), /FFOffer\.lvl\('reminder'\)/);
});

test('brand kit: Bop purple, the official tagline, no retired tagline or orange, kit statuses present', () => {
  const html = site().render('brand-kit'), src = read('offer-clarity.js') + read('offer-clarity.css');
  assert.match(html, /#8236AE/); assert.match(html, /Learn\. Move\. Explore\. Belong\./);
  assert.doesNotMatch(src, /Learn\. Play\. Explore/); assert.doesNotMatch(src, /#E8761E/i);
  for (const s of ['Enrollment flyer', 'Social posts', 'Tour emails', 'Welcome packet', 'Open-house kit', 'Window graphics']) assert.match(html, new RegExp(s));
  assert.match(html, /data-oc-download/);
});

test('index.html loads offer-clarity after room-kit, with a version', () => {
  const idx = read('index.html');
  assert.match(idx, /offer-clarity\.js\?v=\d+/); assert.match(idx, /offer-clarity\.css\?v=\d+/);
  assert.ok(idx.indexOf('room-kit.js') < idx.indexOf('offer-clarity.js'));
});
