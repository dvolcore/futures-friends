# Futures Friends

Static public site for the Futures Friends early-learning program. The premium
experience preserves the existing catalog, illustrations, lesson preview, and
portal adapter while rebuilding the homepage and Academy workspace.

## Preview

From this directory, run `python3 -m http.server 8768`, then open
`http://127.0.0.1:8768/#academy`. No build step or new dependency is required.

## Verify

Run `node --test tests/*.test.js` for catalog filtering, weekly planning,
self-recorded learning exports, and source-status regression tests. Check browser behavior at
390, 768, and 1440 pixels wide. Existing portal integrations require separate
integration testing before production use.

Accessibility (wave 3): `tests/a11y.test.js` (axe-core 4.11.1, WCAG 2.2 AA, 1280 and 390 px, focus rings) and
`tests/a11y-keyboard.test.js` (Story Time reader, Unit 1 viewer in the Teacher Portal, menus and dialogs by keyboard) run in headless Chromium
from `playwright-core` in the platform repo (`HUB_DIR`, default `/Volumes/FFCRM/app`). `node tools/a11y-audit.mjs` sweeps every route
in `route-meta.js` at both sizes; `node tools/a11y-pixel-contrast.mjs` measures text on photos and gradients, which axe cannot.

## Ownership

- `data.js`, `extras.js`, and `views.js`: existing content, views, and routing.
- `features.js`: existing lessons and behavior; exports the narrow `FFX` adapter.
- `premium-core.js`: dependency-free, testable filtering, planning, and CSV logic.
- `premium.js`: homepage, Academy workspace, search, preferences, and navigation.
- `premium.css`: responsive premium presentation and optional animation.
- `motion.js`: native scrolling, short motion, and view hook initialization.
- `img/ui-icons.svg`: local Lucide sprite; license in `LICENSE-LUCIDE.txt`.
- `route-meta.js`: the title and meta description for every `#route`, applied by the `go()` wrapper in `premium.js`.
- `fonts/`: self-hosted Fredoka and Poppins (SIL OFL, licenses alongside); nothing is requested from Google Fonts.
- `teacher-standard.js` and `teacher-standard.css`: Our Teacher Standard (`#teacher-standard`) and Train your staff with us
  (`#train-your-staff`), plus their bands on Home, Enroll, For Families, For Centers and Home Daycares. State rules are cited summaries of the
  CRM repo's `research/regulations/`; course facts come from `docs/training/curriculum.json` and are described as in development, never
  as approved. Ms. June appears through `FFSupporting.guide()` / `portrait()` and is always labeled a story-world character.
- `curriculum-gate.js` (wave 7 GATE 2026-10-06; IP LOCKDOWN, owner decision 2026-10-07: "I don't want to give away our full curriculum to
  our competitors"): the full curriculum is NOT on this site or in this repository. `#unit-1` is a public summary (unit-1.js, facts from
  `FFGate.U1` only) with ONE watermarked sample day (`printables/sample/`, thumbnails in `img/curriculum/sample/`) and an honest
  "Licensed centers get the full program: request access" path (#contact); until the Futures Hub is hosted, staff access is through Futures
  Learning Center. The Teacher Portal's Curriculum tab is that access card for every session; #this-week is the week in summary. The day
  plans, packets, Start Monday files, story sets, classroom printables, family-week cards, binder print file, Units 2 to 4, the unit data
  files and the full Learning Steps (`learning-steps-summary.js` here is counts only) live in the PRIVATE platform repo:
  `/Volumes/FFCRM/app/hub/content/curriculum-assets/` (data/ and manifest.json in git, files/ on disk). The generators
  (`tools/make-unit1-packets.py`, `make-unit-packets.py`, `make-curriculum-package.py`, and the checks) write and read there through
  `tools/private_paths.py` (`FF_CURRICULUM_PRIVATE`). Tests: `tests/ip-lockdown.test.js` (fails if any curriculum file comes back),
  `tests/w7-gate.test.js`, and `tests/private-curriculum-data.test.js` (the private data, skipped where it is not mounted).
  Inventory and decisions: `~/Downloads/FUTURES_FRIENDS_PROJECT/13_Site_Map/IP_LOCKDOWN_2026-10-07.md`.
- `plush-cast.js` (wave 5): `window.FFPlush`, the ONE source of character art. Every character picture on the site is a file from
  `img/plush/characters` (480/960 with srcset, the manifest's intrinsic size), including the 12 generated lead poses
  (`FFPlush.pose('zuri', 'magnifier')`) and the story-world rooms (`FFPlush.env()`). `img/cut_*.webp` stay for the print kit only.
- `supporting-cast.js`: the 17 supporting characters (Ms. June, Principal Hazel, Mr. Moss, Ms. Fern, the classmates, the families),
  `town()` (#friends, everyone at true relative height), `guide()`, `cameo()` and `duo()`. Every appearance carries a visible
  "Story-world character" label; names and roles beyond Ms. June are proposals (img/plush/manifest.json `proposed`).
- `plush-textures.css`: the signature textures as a system (`--tx-*` tokens, `.tx-felt` / `.tx-cloud` / `.tx-cream` / `.tx-meadow`,
  `.tx-ground`). Story-world surfaces are felt; real-world content stays on paper. Off in print and with prefers-reduced-data.
- `plush-world.css`: where scenes, cameos and labels sit inside existing layouts. `FFArt.scene()` (brand-art.js) puts a plush room
  behind friends with an Illustration label. Tests: `tests/w5-site.test.js`.
- `brand-art.js` and `brand-art.css`: honest flags on art that is not final (AI-rendered rooms, old-brand drafts, placeholder
  videos keep their slots and say so), labelled placeholder slots for photos and video still to come, and the Home hero stage.
- `hero-motion.js` and `hero-motion.css`: the Home hero's motion. First visit: "Learn. Move. Explore. Belong." reveals word by word and
  each word calls its friend onto the stage; the friends on the audience doors pop in after. Each friend is a button (one tab stop, arrow
  keys) that reacts on hover/focus and says its motto on click/tap/Enter. Pointer depth on desktop, a light ambient layer that pauses off
  screen and on hidden tabs. Character art only moves, rotates or scales uniformly. Nothing moves with reduced motion or the Decorative
  motion switch off. Browser evidence: `node --test tests/browser/hero-motion.browser.mjs`.
- `hero-world.js` and `hero-world.css` (wave 7): the Home hero as a 3D world of felt depth planes (markup in `meadow-hero.js`): the
  first-visit fly-through (cloud bank, crane down, the logo flying into its cloud nest, then the cast's entrance from `hero-motion.js`),
  any input fast-forwards it; afterwards the camera drifts by itself and follows the pointer, a phone's tilt and scroll, clouds cross and
  wrap, petals drift (capped by device), a breeze from the pointer or a finger. Phones get all of it; reduced motion or the motion switch
  get the composed world, still. Tests: `tests/w7-wild.test.js`.
- `flc-mark.js` and `flc-mark.css` (wave 9): the Futures Learning Center shield (school logo, footer "A program of" only; never merged
  with the Futures Friends wordmark) as a layered inline SVG traced from `img/brand/flc-mark-rev.png` / `flc-mark.png` by
  `tools/trace-flc-mark.py` (numpy, scipy, Pillow, potrace; paths are generated into `flc-mark.js`). The `<img>` stays in the HTML as
  the no-JS fallback. First view: the shield draws itself, the child rises, the arrow sweeps up, the star pops (~1.6 s); idle star
  twinkle and shine; hover, focus in the block or a tap replays with `ff:sfx` 'sparkle'. Reduced motion or the motion switch: static,
  the PNG's look. `node tools/flc-mark-diff.mjs` writes the overlay diffs, `node tools/flc-mark-evidence.mjs` the videos and strips.
  Tests: `tests/w9-shield.test.js`.
- `home-calm.js` and `home-calm.css`: the calm first-visit Home (wave 4, owner request 2026-10-06) under the hero: three audience doors,
  one quiet status line from the release manifest, the four friends, the day in six steps, our Teacher Standard in brief with the pilot
  center and its labelled photo/video placeholders, and one closing call to action. No downloads, portals, sample data or status tables on
  Home. What used to be on Home is inserted on its audience page: the zone map ("More than a login") on `#for-centers`, the friend carousel on
  `#friends`, the learning loop and stats on `#curriculum`, the whole-child band on `#for-families`, the Academy band on `#teacher-standard`.
  Tests: `tests/w4-home.test.js` (headless Chromium, 1280 and 390 px).
- `wayfinding.js` and `wayfinding.css` (wave 6 NAV): nobody gets lost. An audience switcher in the header (Families / Centers & home
  daycares / Teachers & staff) sets `data-audience` on `<html>`, is remembered on the device and reorders the header's main links (four
  per audience; no choice = the neutral five) and the footer site map. One full-screen felt menu (`#menuT` opens `dialog#ffw-menu`)
  replaces the phone dropdown and the desktop "More" panel: audience buttons, each audience's links in big type, a gold squiggle through
  the current page, portals as lock "preview" pills, "Talk to a real person" and the phone pinned at the bottom; focus trap, Escape,
  focus back to Menu, iOS-proof scroll lock. Search palette (`/` or Ctrl/Cmd+K, `dialog#px-search`): pages from route-meta.js, friends,
  printables, FAQs and lessons, grouped by audience, combobox + listbox. Breadcrumbs above every h1, a sticky "Back to ..." chip on detail
  pages, page turns with View Transitions (h1 + hero friend morph, 250 ms felt title card, 350 ms in all; off with reduced motion or the
  motion switch) and focus on the new h1 after every route change. A context card with the next honest step per audience, the
  "Talk to a real person" band on every page (`#ffw-close`) and an empty `#ff-prefooter` slot above the footer for a friends scene.
  Public hook for other code: `window.FFAudience` — `get()`, `set('families'|'centers'|'staff', {announce, source})`, `clear()`,
  `links(audience)` (that audience's header links), `on(fn)` (returns an unsubscribe), `list`, `labels`; every change also fires
  `document` event `ff:audience` with `{audience, previous, source}`. Tests: `tests/w6-nav.test.js`.
- `not-found.js`: the 404 view for unknown `#routes` (keeps the typed address, noindex while showing).
- `tools/build-og-image.py`: rebuilds `img/og/ff-share-default.png` (1200x630 share image) from the official wordmark and cut-outs.
- `release-manifest.js` (generated, do not edit), `release-truth.js` and `release-truth.css`: release truth (review ticket R8). The CRM repo's
  `docs/release/ASSET_MANIFEST.json` is the single list of what a buyer can receive; `node tools/build-release-manifest.mjs <CRM>/docs/release/ASSET_MANIFEST.json`
  regenerates `release-manifest.js` and `ASSET_MANIFEST.md`. `#pricing`, `#options`, the audience pages and `#quote` group every package item under
  Available now / In development / Coming later from it; Hub features show built / preview / planned; `#watch` defines scheduled program minutes
  (24 a week) apart from the weekly program ceiling (30) and the in-care all-screens ceiling (30 minutes a week, CDC early care standard; was 30 a day until 2026-10-07). Academy records are "completion records", not state credit.
- `release-strip.js` (with styles in `release-truth.css`): the E2 status strip, "Available now / Included at launch / Planned", at the top of every
  commercial route, read from the manifest's `commercial` block through `FFRelease.strip(route)`, with one evidence item (Day 9 packet, a Teacher
  Portal screenshot labelled sample data, or a family activity) beside the claim it supports. The same block gives the proposed launch package, the
  start and recurring-billing terms of every priced package (`FFRelease.terms`) and the coverage rules the calculator and the quote share.
- `whole-child.js` and `whole-child.css`: the Whole-Child story (`#whole-child`, `#bop-at-home`, the licensed-center block on
  `#for-centers`, and the Home and Curriculum entry bands). Copy rules are in the owner spec (`docs/WHOLE_CHILD_SPEC.md` in the
  CRM repo): evidence-informed routines, never medical claims. Forms use `window.FFIntake` and show "open soon" when the gateway is unset.

## Important Limits

The Academy is a local preview. Saved lessons, plans, and self-recorded progress
use this browser's storage and do not sync between devices. Storage failures
fall back to temporary state for the current visit where supported. Lesson
video and knowledge checks are samples, not a complete published curriculum.
Catalog hours are not verified clock hours; no approved professional credential
is issued by the preview.

GitHub Pages serves static files. A portal adapter is not proof of a deployed,
secured backend. Do not enter real child records, sensitive family information,
or production credentials into demo workflows. Production authentication,
organization permissions, persistent records, content approval, privacy
operations, and administrative reporting are separate work.

Decorative motion respects the device's reduced-motion setting and the display
preference control. New views use supplied branding and assets; their use does
not establish owner approval. Concept environments remain labeled as illustrations.

`img/books/<book id>/` holds the finished art of the four friends' storybooks (the revised editions of October 7, 2026:
`booker-tries-again`, `big-feelings-brighter-days`, `what-happens-if-we-try`, `clean-up-team`): the cover and the 14 story
illustrations as 640 and 1200 pixel WebP copies of the 1254 by 1254 masters, shown in the Story Time read-along (cover, 14 story
pages and the book's three family/educator pages, 18 pages in all). They are screen copies, not print masters. Story text and
guide pages live in `family-library-data.js`. Private source PDFs are not included in the public site.

## Hub backend (optional, off on the live site)

`hub-backend.js` connects the Teacher and Family portals to the Futures Hub
Supabase project (real sign-in, row-level security, private child photos). It
does nothing unless `window.FF_HUB = {url, anonKey}` is set. On the `release-platform` branch `hub-config.js` carries the
production API (`https://ff-api.dvolcore.com`) and a PUBLIC anon key that is written only by
`node tools/set-hub-config.mjs <CRM repo>/deploy/out/hub-public.json` (it refuses anything but an anon-role key); while the
key is empty GitHub Pages keeps the sample portals. For
local testing copy `hub-config.local.js.example` to `hub-config.local.js`
(git-ignored, only loaded on localhost / 127.0.0.1) and fill in the local URL and
the PUBLIC anon key. Never put a service-role key in any file served to the
browser. Backend schema and tests live in `app/hub` (see its README).


## Requests, applications and careers (optional, off on the live site)

The contact, quote, program-inquiry, tour, enrollment-application, request-status and job-application forms send to the
Futures Friends intake gateway (`intake.js`, configured by `intake-config.js`). A success message with a reference number is
shown only after the gateway has stored the request; nothing is kept in the browser. On the `release-platform` branch
`intake-config.js` points at the hosted gateway `https://ff-intake.dvolcore.com`; with an empty url every one of those forms
says "Online requests open soon" with the phone number and email instead of pretending to send. For local testing copy `intake-config.local.js.example` to
`intake-config.local.js` (git-ignored, loaded only on localhost / 127.0.0.1). When the gateway is hosted over HTTPS, set its
public address in `intake-config.js`. Never put a secret in a file served to the browser.

`#jobs` lists the open positions from the CRM and `#job/<id>` shows one with an application form and resume upload (PDF or
DOCX, up to 5 MB). Run `node --test tests/*.test.js` to check the client.

## Website statistics (optional, off until configured)

`analytics.js` sends privacy-first counts to Futures Friends' own self-hosted, cookieless analytics server (Umami), configured
by `analytics-config.js`. With an empty `url` or `siteId` it sends nothing at all and `window.ffTrack(name, props)` does
nothing. It never sends on the portals, the Academy or the LMS, honors Do Not Track and Global Privacy Control, sends route
names only (`#job/<id>` is counted as `/job`), drops personal-looking properties, and keeps campaign tags (`utm_*`) in
sessionStorage only. At go-live the CRM repo's `deploy/site-config.sh` runs `node tools/set-analytics-config.mjs
<CRM repo>/deploy/out/hub-public.json` (accepts only `https://ff-stats.dvolcore.com` and a UUID). For local testing copy
`analytics-config.local.js.example` to `analytics-config.local.js` (git-ignored, localhost only). Other modules add events
with `ffTrack('store_add', {item})` or `data-track="name" data-track-<prop>="value"` attributes. Event taxonomy, UTM
conventions and the privacy reasoning: `docs/analytics/ANALYTICS_PLAN.md` in the CRM repo.

## Training screens (hub mode only)

`academy-lms.js`, `academy-lms-team.js`, `academy-lms-author.js` and `academy-lms.css` add the signed-in training
screens: `#learn` (my training), `#learn-course/<id>`, `#learn-cert/<id>`, `#learn-team` (directors and HQ),
`#learn-author` (HQ) and the public `#verify/<code>`. They use the session `hub-backend.js` already holds and do
nothing without `window.FF_HUB`, so the live site and the public `#academy` page are unchanged. Every permission is
enforced by the database (see `app/hub/TRAINING.md`).

## Publishing: the clean repository (IP lockdown, 2026-10-07)

The public repository `dvolcore/futures-friends` was re-created on 2026-10-07 with ONE fresh root commit of the cleaned tree, so its history
holds no curriculum. The old repository (full history, including the curriculum) is `dvolcore/futures-friends-archive-2026-10-07`, PRIVATE;
never make it public again and never push old history to the public repo. The live link is unchanged: https://dvolcore.github.io/futures-friends/.

- `release-platform` now starts at the new root commit. The pre-clean line is kept LOCALLY as `release-platform-preclean-2026-10-07`
  (never push it). The publish copy `~/futures-friends-hotfix` tracks the new repo's `main`; the autopublisher fast-forwards `main` to
  `release-platform` and pushes.
- Every other branch (and worktree) was made from the OLD history. Do NOT merge it into `release-platform` (that would bring the old
  history, and the curriculum in it, back). Rebase only your own commits onto the new root instead:

```sh
git fetch --all
OLD_BASE=$(git merge-base <your-branch> release-platform-preclean-2026-10-07)
git rebase --onto release-platform "$OLD_BASE" <your-branch>      # replays only your commits on top of the clean line
git log --name-only --format= release-platform..<your-branch> | grep -E 'printables/unit-|unit[0-9]-(data|prep|family)\.js|curriculum-indicators' && echo STOP
node --test tests/ip-lockdown.test.js                            # must pass before you merge
```

  If a commit of yours adds packets or unit data, drop it from the rebase and regenerate into the private repo instead.

## Publishing: bump the build stamp

Phones keep stale copies of the site (GitHub Pages caches pages for 10 minutes; iOS keeps tabs alive). `build-stamp.js` compares the
build in `index.html` (`window.FF_BUILD = '...'`, in the first line) with `version.json` and reloads a stale page once. On every
publish, set both to the same new value (for example the date and a counter), in the same commit:

```sh
B=2026-10-07.2 && printf '{"build":"%s"}\n' "$B" > version.json && sed -i '' "s/window.FF_BUILD = '[^']*'/window.FF_BUILD = '$B'/" index.html
```

`tests/w9-build-stamp.test.js` fails if the two differ. Add `?nostamp` to a URL to switch the check off.

- `library-catalog.js`, `library-core.js` and `img/library/` are GENERATED by the Hub repo (`hub/scripts/build-library.mjs --site <this folder>`); never hand-edit them. `library-demo.js` and `library-demo.css` are the Resource Library in the demo Director and Teacher portals (permission `library` in demo-core.js): the public rule is that a private item shows the "Opens in your hosted Futures Hub" label and never a file path, public items open in an in-page dialog, and Send queues in the demo database (`libsends`, `liblog`) because email is off. Tests: `tests/library-demo.test.js`.
