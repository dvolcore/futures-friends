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
