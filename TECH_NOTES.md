# Home hero, wave 8: technology notes

Lane HERO, 2026-10-06. Base is `cd8dbd0` (live). The owner asked: "Have we really looked at everything we can possibly do from a technology standpoint ... like Apple glass in a few places ... a lot more polished, high-end."

Everything below is progressive enhancement. With reduced motion or the motion switch off, visitors get the assembled logo and a still world. Every loop pauses off screen and on hidden tabs. The evidence is in `~/futures-friends-w8-hero-evidence/`.

## How it was measured

- Headless Chromium (playwright-core from the platform repo), a local server, `?fresh=`, 6.5 s from load.
- "GPU" means the M4 Max through ANGLE/Metal. "SwiftShader" means software rendering: the default headless setup, standing in for a machine with no usable GPU.
- "4x CPU" means CDP `Emulation.setCPUThrottlingRate 4`.
- Hero bytes: the encoded bytes of every `<img>` in `.mh-hero` plus the petal sprites, with each URL counted once.

## Kept

| Technique | What it does | Numbers |
|---|---|---|
| **Logo kit + CSS sprites** (one WebP) | The `<img>` shows the badge without its letters, using `object-fit: cover` on the top 379 rows. The 14 letters and the heart are CSS sprites cut from the same file, so badge and letters always paint together and there is no swap jump. | 133 KB, replacing the 102 KB logo. Reassembled vs master at 800 px: mean abs RGB diff **6.2/255**. The shipped logo's own WebP loss is 4.2/255. Alpha is identical. |
| **Web Animations API** for the fly-in | Each letter gets its own arc, spin, blur and squash, held paused before first paint. Any input fast-forwards them (`updatePlaybackRate`). | 15 extra animations during the opening. Long tasks are unchanged: 1–2 at start-up, 110–170 ms, the same as base. |
| **CSS individual transforms** (`translate`/`rotate`/`scale` + `transform`) | Breathing, the 8 s wave, the tap boing and the pointer lean all compose on 2 boxes per letter, with no JS per frame except the lean spring. | The lean spring runs on one rAF, only while something moves. A frame that was already queued does nothing on a hidden tab. |
| **CSS trig** (`sin()`) | Each letter gets its own breathing period and tilt from its index, with no per-letter CSS. | Browsers without it fall back to one shared period. |
| **Scroll-driven animation** (`animation-timeline: view()`) | As the hero scrolls away, the letters drift up and apart and fade to 35%. This runs off the main thread. | `@supports`-gated. Elsewhere the letters stay put. |
| **Liquid glass card** (`backdrop-filter: blur(14px) saturate(160%) brightness(1.08)`, white rim, inset highlights, specular light that follows the camera spring) | Apple-style frosted card over the moving world. | Text contrast on the darkest 2% of backdrop pixels is **≥ 4.5:1** for every card text colour (test). The tint went from 0.64 to 0.8 to get there. Costs 0 fps with a GPU. Under SwiftShader: −6 fps desktop, −25 fps phone (cost-by-feature files). |
| **SVG lens** (`backdrop-filter: url(#mh-lens)`, `feImage` edge ramps → `feDisplacementMap`) | Chromium only. It bends the backdrop at the card's rim. Safari and Firefox keep the plain frosted glass. | It is skipped with reduced transparency and in lite mode. |
| **Canvas 2D light shafts** (drawn once, 480×300, blurred with `ctx.filter`, scaled up, slow CSS breathing) | Shafts falling from the sun through the air in front of the hills. | 0 bytes. Never an LCP candidate. A first version used an `<img>`, and that became the phone's LCP element, so it was moved to canvas. |
| **More planes** | Far mountains at z −1000 (ART lane), with haze at their foot. A light-shaft plane at z −560. Mist on the hills. Birds at z −420. A butterfly at z +90. Bokeh at z +420. | 10 world planes plus the overlay (was 8 + 1). Phones get a 29 KB centre crop of the mountains. |
| **Lite mode** (cores ≤ 4 and memory ≤ 2 GB, or data saver) | No shafts, bokeh, butterfly or live blur. The letters and birds stay. | Uses the same test as the particle budget. |

### Byte trims that paid for the kit and the mountains

| Trim | Saving on a phone |
|---|---|
| Action stills sized by their shown height (`hero-motion.js`) | 117 KB |
| A 1280 px front-grass strip | 27 KB |
| Bird frames at 128 px only | 44 KB on desktop |

## Rejected

| Technique | Why |
|---|---|
| **Hand-rolled WebGL layer** (no library; fragment shader for sun bloom, noise light shafts and bokeh; half resolution) | It worked and costs **0.6 ms/frame of JS (p95 0.8) at 1x, and 1.8–2.9 ms/frame at 4x CPU** (under the 4 ms bar). GPU fps was 120 with or without it (`webgl-eval-*.jsonl`). It did not look better. Procedural noise rays read as "digital" next to the felt art, and the CSS/canvas shafts plus bloom match the storybook better. It would also keep an rAF running forever and break the DESIGN.md rule "never WebGL". On SwiftShader it was cheaper than the CSS layers (it replaces three), but software rendering is not the target. |
| **Conic-gradient shafts with CSS masks** | Two full-hero masked layers cost about 8 fps under SwiftShader. Replaced by the canvas. |
| **Separate haze/mist planes** | Each extra full-size plane cost about 3–4 fps under SwiftShader. The haze now lives inside the mountains and hills planes. |
| **Generated letterless badge** (Codex image route) | A regenerated badge would not be pixel-identical to the logo outside the letters. Local inpainting keeps every original pixel and costs no credits. |
| **View Transitions** | The wayfinding lane already uses them for page title cards. Nothing in the hero changes route. |

## Results (GPU, M4 Max)

| Profile | CLS | LCP (element) | fps avg / p95 frame | Long tasks | Hero bytes |
|---|---|---|---|---|---|
| desktop 1280 | 0 | 172 ms (plate) | 119.5 / 9.8 ms | 0 | 1193 KiB (base 972) |
| desktop 1280, 4x CPU | 0.0012 (= base) | 408 ms | 105.5 / 16.8 ms | 1 (112 ms) | |
| iPhone 13 | 0 | 112 ms (plate) | 120 / 9.9 ms | 0 | **1163 KiB ≈ 1.19 MB ≤ 1.2 MB** (base 1180 KiB) |
| iPhone 13, 4x CPU | 0 | 408 ms | 110.5 / 15.8 ms | 2 (170 ms) | |
| iPhone 13, reduced motion | 0 | 100 ms | 120 | 0 | 943 KiB |

### SwiftShader (no GPU)

| Profile | Base | Now |
|---|---|---|
| Desktop | 49.8 fps | 29.2 fps |
| Phone | 117 fps | 89.6 fps |

This is the real cost of more layers and live glass on a machine without a GPU. Phones with a GPU are unaffected, and low-power phones get lite mode.

### Still open, outside this lane

The phone cast cut-outs are fetched at 960 px (Bop 141 KB, Zuri 118 KB, Lumi 94 KB). The cause is that `brand-art.js` / `plush-cast.js` set `sizes` from the 300 px design height, not the 138 px phone height. Fixing it would save about 250 KB on phones. It is a coordinator item; those files are not this lane's.

# 3D friends (owner 2026-10-12)

"Meet the friends in 3D" on #friends (`friends-3d.js`, engine `ff-3d.js`, three.js r170 vendored in `vendor/three-0.170.0/`). Measured
2026-10-12 in headless Chromium from the platform repo, "GPU" = M4 Max through ANGLE/Metal, "SwiftShader" = software rendering.
GPU ms = a synchronous benchmark (each frame forced to finish with `readPixels`), the friend's idle loop, 120 frames.
The machine was heavily loaded by other jobs while these were taken (load average about 30 to 41 around 16:45 to 16:55, 2026-10-12), so
the numbers are pessimistic; an idle Mac should do at least as well.

| Profile | Tier picked | Canvas (device px) | GPU ms/frame: no fur / 8 shells / 16 shells | JS per frame | rAF median / p95 |
|---|---|---|---|---|---|
| Desktop 1280, DPR 2, GPU | high: 16 shells, DPR 2 | 1166 x 1032 | 1.58 / 1.78 / 2.06 | 0.2 ms | 8.3 / 9.9 ms (120 Hz) |
| Phone 390, DPR 3, iPhone UA, GPU | mid: 8 shells, DPR 1.5 | 522 x 522 | 1.39 / 1.53 / 2.19 | 0.16 ms | 8.3 / 9.7 ms |
| Same, 4x CPU | mid | 522 x 522 | 1.79 / 2.66 / 3.20 | 0.64 ms | 8.3 / 10.0 ms |
| Desktop 1280, SwiftShader | low: no fur, DPR 1 | | 16.3 (no fur) | 0.2 ms | 16.7 / 33.8 ms |
| Phone 390, SwiftShader | low | | 10.5 (no fur) | 0.12 ms | 8.4 / 17.8 ms |

All four friends on the GPU at 1280 (DPR 1): no fur 1.04 to 1.27 ms, 16 shells 2.05 to 2.25 ms (the batch measured 2 to 4.7 ms while
Blender was rendering). Long tasks while the first friend loads: one of 50 ms on the GPU phone profile; 150, 53, 85 and 58 ms at 4x CPU
(module parse, meshopt decode, shader compile); up to 589 ms under SwiftShader (software shader compile).

**Bytes on the first 3D view** (decoded): three.js 675 KB + GLTFLoader 108 + BufferGeometryUtils 31 + meshopt decoder 24 +
RoomEnvironment 4 + engine 23 = 865 KB of JavaScript (217 KB gzip, as GitHub Pages serves it), the friend's GLB 943 KB, and on a
fur tier the fur map 204 KB: 2,012 KB (1,808 KB on the low tier). Each further friend picked: its GLB (0.8 to 0.97 MB) and fur map.

**Phones.** Real phones are untested (owner decision D4). They get the mid tier (8 shells, DPR cap 1.5); data saver, <= 2 GB memory,
software rendering and older mobile GPUs (Mali-4xx/T, Adreno 2xx to 5xx, PowerVR) get plain PBR at DPR 1. On any device the engine
samples 60 frame intervals after a 20-frame warm-up: a median above 22 ms halves the shells, then turns fur off, then drops the DPR to 1.
The "Soft fur" button overrides it either way. On data saver nothing loads until "Show in 3D" is tapped.

**Home's "How a Futures Friends day travels" (day-machine.js): kept 2D.** Swapping a station's cut-out for its 3D friend would mean
at least 1.8 MB (engine + three.js + one GLB; 4.6 MB for all four stations) fetched while scrolling Home, against the phone budget
of 850 KB for everything below the fold (tests/w8-page.test.js), and a second render loop (WebGL) tracking the machine's scroll-scrubbed
2D camera every frame. The GPU cost would be fine (about 1.5 ms per friend per frame); the bytes are not. Loading only on a tap at a
station would keep the budget, but the station friends are drawn small inside a moving, scroll-scrubbed canvas, so a 3D swap there
adds little a visitor would see. The 3D viewer lives on #friends instead; Home and its budget test are unchanged.
