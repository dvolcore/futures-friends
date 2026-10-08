// The Founding Partner pilot (#founding-partners), owner 2026-10-07, content from the Strengths Pack shared brief: the route renders,
// the eight-measure scorecard is there and framed as commitments (no results), no founding discount or founding price is printed
// (franchise-law caution), the application uses the site's existing intake (FFIntake, kind "partner") and shows its honest
// "Online requests open soon" fallback while the gateway is off, and #for-centers and #pricing link in (Home does not).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { site: baseSite, read, text, ROOT } = require('./site-vm');

function site(url) {
  const c = baseSite({ before: url ? { 'data.js': ctx => { ctx.FF_INTAKE = { url }; } } : undefined });
  for (const f of ['intake.js', 'room-kit-plans.js', 'room-kit.js', 'founding-partners.js']) vm.runInContext(read(f), c, { filename: f });
  return c;
}
const FP = c => (c || site()).window.FFFounding;
const same = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m);

test('#founding-partners renders one h1, its sections, unique ids and no template leaks', () => {
  const html = site().render('founding-partners');
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.match(text(html), /Become a Founding Partner/);
  for (const id of ['fp-terms', 'fp-measure', 'fp-who', 'fp-how', 'fp-apply']) assert.ok(html.includes(`id="${id}"`), id);
  assert.doesNotMatch(html, /undefined|\[object Object\]|NaN/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const a of [...html.matchAll(/data-anchor="([^"]+)"/g)].map(m => m[1])) assert.ok(html.includes(`id="${a}"`), 'anchor target ' + a);
  for (const r of [...html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)].map(m => m[1])) for (const id of r.split(' ')) assert.ok(html.includes(`id="${id}"`), 'aria target ' + id);
});

test('hero, who it is for and how it works follow the brief', () => {
  const t = text(site().render('founding-partners'));
  assert.match(t, /90-day pilot for 5 to 10 programs in the Kansas City area, in Missouri and Kansas/);
  for (const s of ['Licensed home providers', 'Small centers', 'Larger centers', 'Church weekday preschools']) assert.ok(t.includes(s), s);
  same(FP().STEPS.map(s => s[0]), ['Apply', 'A 20-minute call', 'A short written agreement', 'Kit and onboarding', 'Weekly check-ins', 'Day-90 review']);
  assert.match(t, /Either side may end the pilot at any time/);
  assert.match(t, /photos only with signed parent releases|Photos only with signed parent releases/);
  assert.match(t, /no child faces by default/);
});

test('the scorecard: eight measures, framed as commitments with no results', () => {
  const html = site().render('founding-partners'), t = text(html);
  same(FP().MEASURES.map(m => m[0]), ['Teacher setup time', 'Daily-use rate', 'Teacher prep time per day', 'Family connection', 'Parent recall', 'Director value', 'Tour signal', 'Issues logged and fixed']);
  assert.equal((html.match(/class="card fp-measure"/g) || []).length, 8);
  assert.match(t, /These are the measures we commit to tracking with you\. No results yet: the first pilot cohort produces them\./);
  assert.match(t, /reported in aggregate/i);
  assert.doesNotMatch(t, /\b(proven|readiness|brain)\b/i, 'no outcome or health claims');
});

test('no founding discount or founding price is printed; the terms are proposed, not an offer', () => {
  const c = site(), html = c.render('founding-partners'), t = text(html);
  assert.doesNotMatch(t, /\d\s*%|percent/i, 'no discount percentage');
  assert.doesNotMatch(t, /\$\s*\d/, 'no dollar amount');
  assert.match(t, /a reduced founding rate on the launch package, no monthly fee during the 90-day pilot, then a founding monthly rate locked for 24 months/i);
  assert.match(t, /exact terms are in a short written agreement/i);
  assert.ok(t.includes('Founding Partner terms are proposed and set in a written agreement after legal review. Not an offer.'));
  for (const where of ['centers', 'pricing']) { const b = text(FP(c).band(where)); assert.doesNotMatch(b, /\d\s*%|\$\s*\d/, where); }
  assert.doesNotMatch(read('founding-partners.js'), /30%|25%|30 percent|25 percent/);
});

test('with the intake gateway off, the form is not shown and the site\'s own "Online requests open soon" fallback is', () => {
  const c = site(), html = c.render('founding-partners'), t = text(html);
  assert.equal(c.window.FFIntake.enabled(), false);
  assert.match(html, /class="ffi-soon"/);
  assert.match(t, /Online requests open soon\./);
  assert.match(html, /href="tel:\+18169885661"/);
  assert.match(html, /href="mailto:info@futureslearningcenter\.com\?subject=/);
  assert.doesNotMatch(html, /id="fpForm"/);
  // the page itself never sends anything: only FFIntake.submit, no fetch, no storage
  const src = read('founding-partners.js');
  assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/);
  assert.match(src, /I\.submit\(p\.kind, p\.data\)/);
});

test('with the gateway on, the form has every field and sends kind "partner" through FFIntake', () => {
  const c = site('https://ff-intake.example.test'), html = c.render('founding-partners');
  assert.equal(c.window.FFIntake.enabled(), true);
  for (const id of ['fpOrg', 'fpType', 'fpCity', 'fpState', 'fpZip', 'fpKids', 'fpRooms', 'fpName', 'fpEmail', 'fpPhone', 'fpWorth', 'fpHp'])
    assert.ok(html.includes(`id="${id}"`), id);
  assert.match(text(html), /What would make this worth it for you\?/);
  for (const m of html.matchAll(/<label class="f" for="([^"]+)"/g)) assert.ok(html.includes(`id="${m[1]}"`), 'label target ' + m[1]);
  const p = FP(c).payload({ org: 'Little Acorns', type: 'church', city: 'Overland Park', state: 'KS', zip: '66212', kids: '32', rooms: '2', name: 'Pat Lee', email: 'pat@example.org', phone: '8165550100', worth: 'Less prep.' });
  assert.equal(p.kind, 'partner');
  same([p.data.interest, p.data.orgType, p.data.zip, p.data.kids, p.data.org], ['program', 'church', '66212', '32', 'Little Acorns']);
  assert.match(p.data.message, /Founding Partner pilot application/);
  assert.match(p.data.message, /City and state: Overland Park, Kansas/);
  assert.match(p.data.message, /Classrooms: 2/);
  assert.match(p.data.message, /What would make this worth it: Less prep\./);
});

test('links in: one band on #for-centers and #pricing, route meta and breadcrumbs; no new Home link', () => {
  const c = site();
  for (const r of ['for-centers', 'pricing']) assert.equal((c.render(r).match(/href="#founding-partners"/g) || []).length, 1, r);
  assert.doesNotMatch(read('home-calm.js'), /founding-partners/, 'Home link budget');
  assert.ok(require(path.join(ROOT, 'route-meta.js')).ROUTES['founding-partners']);
  assert.match(read('wayfinding.js'), /'founding-partners': \['Founding Partners', 'centers', 'for-centers'/);
  const html = read('index.html'), at = s => html.indexOf(s);
  assert.ok(at('<script src="founding-partners.js') > at('<script src="intake.js') && at('<script src="founding-partners.js') > at('<script src="room-kit.js'));
  assert.ok(at('<script src="founding-partners.js') < at('<script src="wayfinding.js'));
  assert.match(html, /<link rel="stylesheet" href="founding-partners\.css\?v=\d+">/);
});
