// "Trusted by professionals" endorsement band: wording comes only from advisor-profiles.js, honest framing, placed where trust is decided.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function setup() {
  const sb = { console, FFhooks: [], document: { addEventListener() {}, createElement() { return {}; }, body: { appendChild() {} } }, requestAnimationFrame: fn => fn() };
  sb.window = Object.assign(sb, { addEventListener() {} });
  const ctx = vm.createContext(sb);
  vm.runInContext(read('advisor-profiles.js'), ctx);
  vm.runInContext(read('endorse-band.js'), ctx);
  return ctx;
}
// A page root whose children are identified by selector; insertAdjacentHTML records the markup and where it went.
function fakeRoot(matches) {
  const log = [];
  const root = {
    inserted: '', log,
    querySelector(sel) {
      if (sel === '.ff-endorse') return this.inserted ? {} : null;
      const key = sel.replace(':scope > ', '');
      return matches.includes(key) ? { insertAdjacentHTML: (where, html) => { log.push(key); root.inserted = html; assert.equal(where, 'afterend'); } } : null;
    }
  };
  return root;
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('the band shows both professionals with their supplied wording, a real blockquote and cite, and good alt text', () => {
  const ctx = setup(), A = ctx.FFAdvisors, E = ctx.FFEndorse;
  const html = E.band('full', 'melissa');
  for (const key of ['melissa', 'laurie']) {
    const p = A.profile(key);
    assert.ok(html.includes(p.name.replace(/&/g, '&amp;')), key + ' name');
    assert.ok(html.includes(p.excerpt), key + ' excerpt is the supplied excerpt, unedited');
    assert.ok(p.statement.includes(p.excerpt), key + ' excerpt is a verbatim part of the full statement');
    assert.ok(text(html).includes(p.role.replace('&', '&')), key + ' role');
    assert.match(html, new RegExp(`data-advisor-profile="${key}"[^>]*aria-haspopup="dialog"`));
    assert.match(html, new RegExp(`alt="${p.name.replace(/\./g, '\\.')}, ${p.role.split(' / ')[0]}"`));
    assert.ok(fs.existsSync(path.join(__dirname, '..', html.match(new RegExp(`ffe-${key}[\\s\\S]*?src="([^"]+)"`))[1])), key + ' portrait file exists');
  }
  assert.equal((html.match(/<blockquote>/g) || []).length, 2);
  assert.equal((html.match(/<cite>/g) || []).length, 2);
  assert.match(html, /Read the full statement/);
  assert.match(html, /<h2 id="ffe-h-full">Trusted by professionals<\/h2>/);
  assert.match(text(html), /RN with 40 years of experience, including pediatrics and community health/);
  assert.ok(html.indexOf('Melissa Hill') < html.indexOf('Laurie Ouding'), 'the curriculum endorsement leads');
  assert.ok(E.band('full', 'laurie').indexOf('Laurie Ouding') < E.band('full', 'laurie').indexOf('Melissa Hill'));
});

test('honest framing: reviews of the curriculum and menu, never employees, advisors, board or accreditation, and never the word concept', () => {
  const E = setup().FFEndorse;
  const all = ['full', 'compact', 'strip'].map(v => E.band(v, 'melissa')).join(' ');
  assert.match(all, /not an accreditation or a certification of every recipe/);
  assert.doesNotMatch(text(all), /\b(advisor|advisory|board|employee|staff|faculty member|certified every|accredited by)\b/i);
  assert.doesNotMatch(read('endorse-band.js') + read('endorse-band.css'), /concept/i);
  assert.doesNotMatch(all, /concept/i);
  assert.doesNotMatch(all, /application\/ld\+json|itemtype|"@type"/);   // no schema: nothing here is machine-claimed
});

const FULL_ROUTES = ['home', 'centers', 'for-centers', 'why', 'enroll', 'membership', 'pricing'];
test('the full band renders on #home, #centers, #for-centers, #why, #enroll, #membership and #pricing; compact on #for-families; a strip in both shops', () => {
  const ctx = setup(), hook = ctx.FFhooks[0];
  assert.equal(typeof hook, 'function');
  for (const route of FULL_ROUTES) {
    const root = fakeRoot(['.phero', '.px-homehero', '#launch', '.phero + section.tight']);
    hook(route, root);
    assert.match(root.inserted, /data-endorse="full"/, '#' + route);
    assert.match(root.inserted, /Melissa Hill/);
    assert.match(root.inserted, /Laurie Ouding/);
  }
  { const root = fakeRoot(['.phero']); hook('for-families', root); assert.match(root.inserted, /data-endorse="compact"/); }
  for (const route of ['kids-shop', 'shop']) {
    const root = fakeRoot(['.sf-cols', '.sp-rail']); hook(route, root);
    assert.match(root.inserted, /data-endorse="strip"/, '#' + route);
    assert.match(text(root.inserted), /Eat the Rainbow menu reviewed by Laurie Ouding, RN, LNC/);
    assert.match(text(root.inserted), /Curriculum reviewed by Melissa Hill, M\.Ed\./);
  }
  // other routes get nothing; a second render of the same root does not stack a second band
  const other = fakeRoot(['.phero']); hook('contact', other); assert.equal(other.inserted, '');
  const again = fakeRoot(['.phero']); hook('centers', again); hook('centers', again); assert.equal(again.log.length, 1);
});

test('placement sits right after the hero or the offer, and below the store hero and campaign band', () => {
  const src = read('endorse-band.js');
  assert.match(src, /home: \{[^}]*after: \['\.px-homehero'/);
  assert.match(src, /enroll: \{[^}]*'\.phero \+ section\.tight'/);
  assert.match(src, /pricing: \{[^}]*'#launch'/);
  assert.match(src, /'kids-shop': \{[^}]*'\.sf-cols'/);
  assert.match(src, /shop: \{[^}]*'\.sf-cols'/);
  // the store strip never anchors on the hero or the campaign band
  assert.doesNotMatch(src, /'(\.h3|\.cp-band|\.cp-strip|\.h3-trust)/);
});

test('Spanish draft strings cover every visible phrase', () => {
  const es = read('i18n-es-6.js'), src = read('endorse-band.js');
  for (const k of ['Trusted by professionals', 'Reviewed our curriculum', 'Reviewed our Eat the Rainbow menu', 'Read the full statement', 'Read statement', 'Curriculum reviewed by', 'Eat the Rainbow menu reviewed by', 'Professional reviews',
    'RN with 40 years of experience, including pediatrics and community health', 'Education Adjunct Faculty / Curriculum & Instruction / Educator Development']) assert.ok(es.includes(`'${k}':`), k);
  assert.ok(es.includes('Read the full statement from'));
  assert.ok(es.includes(`'I\\u2019m impressed by the way it combines`));
  assert.ok(es.includes('Each statement and profile was supplied by the professional'));
  assert.ok(src.includes('Each statement and profile was supplied by the professional'));
  assert.match(es, /DRAFT, pending review/);
});

test('index.html loads the band after the advisor profiles, with versions, and the profile dialog still works for it', () => {
  const idx = read('index.html');
  assert.match(idx, /endorse-band\.css\?v=\d+/); assert.match(idx, /endorse-band\.js\?v=\d+/);
  assert.ok(idx.indexOf('advisor-profiles.js') < idx.indexOf('endorse-band.js'));
  assert.ok(idx.indexOf('views.js') < idx.indexOf('endorse-band.js'), 'after the routes exist');
  assert.match(read('advisor-profiles.js'), /closest\('\[data-advisor-profile\]'\)/);
  const css = read('endorse-band.css');
  assert.match(css, /prefers-reduced-motion:reduce/); assert.match(css, /data-motion=off/); assert.match(css, /max-width:560px/);
});
