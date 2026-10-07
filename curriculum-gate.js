/* Futures Friends curriculum gate (wave 7 GATE 2026-10-06; IP lockdown, owner decision 2026-10-07: "I don't want to give away our full
   curriculum to our competitors").
   - The public site shows a SUMMARY of the curriculum (unit-1.js #unit-1) built only from the facts below: titles, the four weeks,
     counts and status, plus ONE watermarked sample day packet (printables/sample/) and a few cover thumbnails (img/curriculum/sample/).
   - The full curriculum (day plans, packets, Start Monday files, classroom printables, story sets, family-week cards, Units 2 to 4 and the
     Learning Steps crosswalk) is NOT on this website and is not in its repository. It lives in the private platform repo
     (FFCRM hub/content/curriculum-assets/). This site never requests it. Licensed centers get the full program through Futures Learning
     Center until the Futures Hub is hosted; nothing here pretends to be a login to it.
   The counts and titles in U1 are copied from the private unit1-data.js (tools/make-unit1-packets.py); tests/w7-gate.test.js compares
   them when the private repo is mounted. Loaded before unit-1.js, this-week.js and prep-ahead.js. Sends nothing, stores nothing. */
(function () {
'use strict';
const W = typeof window !== 'undefined' ? window : {};

// A session counts only when the Hub is configured, the person is connected (after two-step verification for directors and HQ)
// and the shared-tablet idle lock is not on.
function session() {
  const H = W.FFHub;
  if (!H || !H.configured || !H.connected || !H.role) return null;
  if (W.FFHubAuth && typeof W.FFHubAuth.isLocked === 'function' && W.FFHubAuth.isLocked()) return null;
  return String(H.role);
}
const staff = () => { const r = session(); return !!r && r !== 'family'; };
const family = () => session() === 'family';
const member = () => !!session();

// No curriculum data file is ever loaded from the public site (IP lockdown 2026-10-07). Kept as a stub so older callers get "no".
function load() { return false; }

// ---------------------------------------------------------------- the public summary facts (no lesson text)
const U1 = {
  title: 'Welcome to Futures: Meet the Friends',
  ages: 'Twos, threes and pre-K (ages 2 to 5)',
  days: 20,
  activities: 161,
  weeks: [
    { week: 1, lead: 'booker', theme: 'Hello, Futures! Meet Booker', value: 'Confidence', pillars: ['LEARN', 'SMILE'], celebration: 'Brave Learner Day' },
    { week: 2, lead: 'lumi', theme: 'Meet Lumi: Big Feelings', value: 'Kindness', pillars: ['BELONG', 'RESET'], celebration: 'Kindness Day' },
    { week: 3, lead: 'zuri', theme: 'Meet Zuri: Look Closely', value: 'Curiosity', pillars: ['EXPLORE', 'NOURISH'], celebration: 'Explorer Day' },
    { week: 4, lead: 'bop', theme: 'Meet Bop: I Can Do It!', value: 'Independence', pillars: ['MOVE', 'OUTSIDE'], celebration: 'Futures Friends Celebration' }
  ],
  // three day titles as a taste of the month: titles only, never the plan behind them
  sample: [[9, 'Kind Hands, Kind Words'], [14, 'Sink or Float'], [19, "Bop's Big Dance Party"]],
  // what an educator opens in the Teacher Portal, counted from the release files (unit1-data.js files[] by kind)
  files: { day: 20, bundle: 20, story: 5, classroom: 1, family: 1, 'family-week': 4 },
  pages: 960
};
U1.fileCount = Object.values(U1.files).reduce((a, n) => a + n, 0);
// Units written day by day after Unit 1 (draft): only their numbers are public, never their content.
U1.written = [2, 3, 4];
// The one public sample (watermarked "Sample - licensed centers receive the full program") and how to ask for the full program.
const SAMPLE = { day: 9, title: 'Kind Hands, Kind Words', pages: 11, path: 'printables/sample/ff-sample-u1-day-09-teacher-packet.pdf',
  thumbs: ['img/curriculum/sample/sample-day-09-p1.webp', 'img/curriculum/sample/sample-day-09-p3.webp'] };
const ACCESS = { route: 'contact', school: 'Futures Learning Center',
  note: 'Licensed centers get the full program. The Futures Hub is not hosted yet, so staff access is through Futures Learning Center for now.' };

W.FFGate = { session, staff, family, member, load, U1, SAMPLE, ACCESS };
})();
