/* Futures Friends: "This week with <friend>" (#this-week, optional #this-week/<booker|lumi|zuri|bop>), ETEACH leverage 2 / E10.
   Wave 7 GATE (2026-10-06) and IP lockdown (owner decision 2026-10-07): the week's family cards are part of the licensed curriculum and are
   not on this website. This page is a short public summary of the week (friend, theme, value, from FFGate.U1) that tells families enrolled
   at Futures Learning Center the cards come home from their child's classroom, and points everyone to the free Futures at Home library.
   No activity text, no card PDF, no data file is loaded. */
(function () {
'use strict';
if (typeof V === 'undefined') return;

const KEYS = ['booker', 'lumi', 'zuri', 'bop'];
const NAMES = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const G = () => window.FFGate || { U1: null };
// Character art from the plush library (FFPlush, plush-cast.js): the display size in the attributes, 480/960 by srcset.
const art = (k, h) => window.FFPlush.img(k, { alt: '', h, fixed: true });

// Public: the week in one paragraph and the way in. Friend, theme and value only (FFGate.U1); no activity, no card.
function teaser(a) {
  const W = (G().U1 || { weeks: [] }).weeks;
  if (!W.length) return '';
  const k0 = String(a || '').toLowerCase(), w = W.find(x => x.lead === k0) || W.find(x => String(x.week) === k0) || W[0], k = w.lead, nm = NAMES[k];
  return `<div class="tw tw-public" style="--c:var(--wc-${k})">
   <header class="tw-hero"><div class="wrap tw-hero-grid"><div>
    <span class="tw-kick">For families at a Futures Friends program</span>
    <h1>This week with ${nm}</h1>
    <p class="lede">Week ${w.week} of the first month: ${E(w.theme)}. This week's value is ${E(w.value.toLowerCase())}. Each school day the class does an activity with ${nm}, and families get a matching three-minute activity to try at home.</p>
    <p class="tw-status"><span class="tw-chip">Enrolled families</span> The week's activities and printable family cards come home from your child's classroom at Futures Learning Center. They are part of the licensed program, so they are not on this website.</p>
    <span class="tw-get"><a class="btn gold" href="#at-home">Free activities for every family</a><a class="btn soft" href="#contact">Ask us a question</a></span></div>
    <div class="tw-art">${art(k, 220)}</div></div></header>
   <nav class="tw-pick wrap" aria-label="Choose a friend">${W.map(x => `<a href="#this-week/${x.lead}" ${x.lead === k ? 'aria-current="page"' : ''}>${art(x.lead, 44)}<span>Week ${x.week}: ${NAMES[x.lead]}</span></a>`).join('')}</nav>
   <p class="wrap tw-foot">Futures at Home is free for every family, with no account: storybooks, activities and printables. Curious about the classroom side? Read the <a href="#unit-1">Unit 1 summary</a>.</p></div>`;
}

V['this-week'] = () => teaser(typeof arg !== 'undefined' ? arg : null);

// entry points: Futures at Home (public: points at the Family Portal) and the family portal (opens the week only when signed in)
const band = (where) => `<section class="tw-band" aria-label="This week with the Futures Friends"><div>${KEYS.map(k => art(k, 56)).join('')}</div>
  <p><b>This week with Booker, Lumi, Zuri or Bop.</b> ${where}</p>
  <span>${KEYS.map(k => `<a href="#this-week/${k}">${NAMES[k]}</a>`).join(' · ')}</span></section>`;
if (V['at-home']) {
  const base = V['at-home'];
  V['at-home'] = () => base().replace(/<\/div>\s*$/, () => `<div class="wrap">${band('Families enrolled at Futures Learning Center get the week\'s classroom activities, with a three-minute version to try at home, from their child\'s classroom.')}</div></div>`);
}
const ANCHOR = '<div class="wrap" style="display:grid;gap:16px">';
if (V['family-portal']) {
  const baseFam = V['family-portal'];
  V['family-portal'] = () => {
    const html = baseFam(), at = html.indexOf(ANCHOR);
    const b = band('This week\'s family cards come home from your child\'s classroom at Futures Learning Center. In this sample preview, see the week in brief.');
    return at < 0 ? html : html.slice(0, at + ANCHOR.length) + b + html.slice(at + ANCHOR.length);
  };
}

window.FFThisWeek = { teaser };
})();
