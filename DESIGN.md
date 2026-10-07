# Futures Friends DESIGN.md

A pop-up storybook. Every page opens like a felt pop-up book: a real room behind, the friends standing in front as cut-out layers, live text on the calm side. The one bold move is that layered depth; everything else stays quiet.

## Color
- Clubhouse navy: #0A2B38 (page bands, header, footer, text on light)
- Star gold: #E7A928 (buttons, stars, focus rings)
- Felt cream: #FBF6EC (light sections)
- Booker blue: #0B5ED7 (LEARN + SMILE, Booker)
- Lumi pink: #D9488B (BELONG + RESET, Lumi)
- Zuri green: #2E9E57 (EXPLORE + NOURISH, Zuri)
- Bop purple: #8236AE (MOVE + OUTSIDE, Bop; owner decision 2026-10-07, was orange #E8761E). Text-safe ink #6B2A8E (8.9:1 on white, 8.3:1 on cream); lavender #C9A2EC (dark mode, light felt); tint #F3EAFB. Bop the plush keeps his grey fleece and green overalls: the brand accent changed, the character did not.
- Watch teal (learning-loop step 1, not a friend): #0A7A8A (white text 5.0:1; token `--watch`), dark mode #5CC6CE with navy text (7.4:1); print ink #0B6672, tint #E5F4F5 (`watch` in tools/ff_brand.py). Changed 2026-10-07 from purple #7B57C8, which read as Bop purple. The loop: Watch teal, Talk Booker blue, Do Zuri green, Move Bop purple, Explore Lumi pink, Take home gold.
- Tagline: "Learn. Move. Explore. Belong." (official, owner 2026-10-07; never "Learn. Play. Explore. Belong.")

## Type
- Display: Fredoka 600/700. matches the rounded felt lettering of the wordmark; headlines only.
- Body: Atkinson Hyperlegible 400/700. built for readability; fits a literacy program and parents reading on phones.

## Rules
- The program title on Home is the plush logo (stitched felt FUTURES, fleece FRIENDS; owner 2026-10-06, img/plush/hero), the h1 with the accessible name "Futures Friends". The Futures Learning Center shield is the school logo only. Never a paw emblem or any other generated mark.
- Characters are always cut-out layers on top of scenes, never a rectangle photo with its own background.
- Headlines and body copy are live text, never baked into art.
- No all-caps eyebrow above every heading, no middle-dot strings, no one-word color accents in headlines.
- No identical card grids as the default layout; use the shelf, the stage, the pinned story and the path tiles instead.
- One orchestrated motion moment per page (on Home, wave 7: one continuous shot, the camera flies down out of a cloud bank into the plush meadow, the plush logo flies in through the clouds and lands in its cloud nest, then the friends arrive, Booker last to center stage; any input fast-forwards it); other motion answers what the visitor does (hover, focus, tap, tilt, scroll). All of it is built on ff-motion.js.
- Home's world has real depth (hero-world.css/js): flat felt planes at their own depth, the camera slides around the cast's plane so the friends never slide; never a tilted or stretched plane, never WebGL.
- Everything still reads with motion turned off (reduced-motion users get the open book, already open).
- Every AI image of a room or product carries a concept label; the real center appears only in real photos.
- Story-world surfaces are felt (plush-textures.css); real-world content stays on plain paper. Characters stand on a felt-grass strip.
- Grown-ups and children share one height unit (manifest lineup_scale); a child is never drawn taller than the grown-up beside them.
- Every supporting character near real-world content carries a visible "Story-world character" label.
- Booker is the lead: center stage and in front wherever the four friends stand together on Home; all four share one ground line.

## Curriculum print system (wave 10, 2026-10-07): the stitched storybook
One identity for every curriculum piece: day packets, Start Monday bundles, classroom printables, family cards, story sets, Futures at Home printables, the binder and the Teacher Portal / #unit-1 pages. Source of truth: `tools/ff_brand.py` (tokens, felt, stitch, cast roles, icons); generators `tools/make-unit1-packets.py`, `tools/make-printables.py`, `tools/make-curriculum-package.py`; web layer at the end of `unit-1.css`.
- Logo: every Futures Friends logo in the curriculum is the plush wordmark (img/brand/ff-plush-wordmark-640.png; the square plush FF mark where a square fits). The FLC shield never appears in curriculum pieces.
- Paper and felt: teaching content stays on plain warm paper (#FFFDF8). Felt (the plush felt-cream grain recoloured per friend, tiled at true texture scale) is only for story-world surfaces: covers, day/section openers, the week thumb tab, guide notes, posters, zone signs, family-card bands.
- The stitch: a dashed thread line inset on every felt surface and used as the rule under every heading and table head. It replaces heavy side bars (none anywhere).
- Colour per lead friend and pillar: ink (`deep`, 4.5:1+ on paper and tint) / surface (`felt`, white text 4.6:1+) / tint. Booker #23589F/#2F67B3, Lumi #A82A65/#C4467F, Zuri #1B6E3E/#2E8452, Bop #6B2A8E/#8236AE (purple since 2026-10-07), navy #0A2B38/#173F52. CMYK builds for the press live in `CMYK` (inside SWOP coverage).
- Type: Fredoka 700 display (day numbers, covers), Fredoka 600 headings, Poppins 400/600 text. Scale (pt): cover 54-76, opener 40-44, title 24, h1 20, h2 14.5, h3 12, body 10.2, small 8.6, label 7.4. PDF stamps and contents use the same Poppins files (never Helvetica).
- Icons: one drawn set (24-unit grid, one stroke weight) for every block type and section (circle, picture-talk, friends-live, activity, outside, move, zones, story, meal, home, goodbye, supplies, print, routine, safety, observe, song, kitchen, art, timing, join, watch, talk, ...). The PDFs draw it; the web uses the generated sprite `img/curriculum/icons.svg`.
- Cast in recurring roles, always labelled "Story-world character" beside real-world content: Ms. June = teacher notes (day packet, Start Monday cover, story cue cards); Principal Hazel = routines and safety (daily routines, timing sheet, nature rules); Mr. Moss = room setup and supplies (supply lists, prep list, classroom printables cover); Ms. Fern = art and messy play (art table sign); classmates = activity examples; each friend's grown-up = family cards (Bruno/Booker, Rose/Lumi, Sage/Zuri, Ella/Bop). Avatars are pop-outs (the cut-out stands out of the felt disc's top edge), never a circle mask.
- Week thumb tab on the outer edge: colour, "Week N" and its height on the page all encode the week, so pages still sort in black and white. Colour is never the only code: every block has its icon and name.
- Print: US Letter, 0.6 in margins, nothing essential in the outer 0.36 in (tab) or the bottom 0.3 in (bundle stamp). Packaging: 0.125 in bleed, crop marks, CMYK vectors. Characters about 240 dpi at placed size; images recompressed by swapping Flate RGB streams for JPEG in place (MuPDF's rewrite_images crashes on these files: never use it).
- Accessibility: PDFs carry title, subject, /Lang and DisplayDocTitle; text stays live (selectable, searchable, read by the checkers). Reportlab cannot write tagged PDF, so there are no structure tags or image alt text inside the PDFs yet.
