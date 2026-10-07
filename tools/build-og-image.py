#!/usr/bin/env python3
"""Build the default share image (OG-01) from official assets only: the sticker wordmark, the four official cut-outs and the
brand colors. The wordmark is the approved plush logo (tools/build-plush-brand.py). Output: img/og/ff-share-default.png, 1200x630.

    python3 tools/build-og-image.py

Needs Pillow; fontTools + brotli to read the self-hosted Fredoka woff2 (falls back to Pillow's default font without them).
"""
import io
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
W, H = 1200, 630
NAVY, NAVY2, GOLD, CREAM = (10, 43, 56), (18, 62, 80), (231, 169, 40), (251, 246, 236)
CHAR = {'booker': (47, 111, 192), 'lumi': (217, 72, 139), 'zuri': (46, 158, 87), 'bop': (232, 118, 30)}


def font(size):
    try:
        from fontTools.ttLib import TTFont
        f = TTFont(P('fonts', 'fredoka-latin.woff2'))
        f.flavor = None
        buf = io.BytesIO()
        f.save(buf)
        buf.seek(0)
        ft = ImageFont.truetype(buf, size)
        try:
            ft.set_variation_by_axes([600])          # Fredoka is a variable font: weight 600, as on the site
        except Exception:
            pass
        return ft
    except Exception:
        return ImageFont.load_default(size)


def glow(img, xy, r, rgb, alpha):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = xy
    d.ellipse((x - r, y - r, x + r, y + r), fill=rgb + (alpha,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r * 0.55)))


def dashed_round_rect(d, box, radius, color, width, dash=14, gap=10):
    x0, y0, x1, y1 = box
    # straight edges only (corners are drawn as arcs), enough for a felt-stitch line
    for (a, b, horiz, fixed) in [(x0 + radius, x1 - radius, True, y0), (x0 + radius, x1 - radius, True, y1),
                                 (y0 + radius, y1 - radius, False, x0), (y0 + radius, y1 - radius, False, x1)]:
        p = a
        while p < b:
            q = min(p + dash, b)
            d.line(((p, fixed), (q, fixed)) if horiz else ((fixed, p), (fixed, q)), fill=color, width=width)
            p = q + gap
    for cx, cy, start in [(x0 + radius, y0 + radius, 180), (x1 - radius, y0 + radius, 270), (x1 - radius, y1 - radius, 0), (x0 + radius, y1 - radius, 90)]:
        for s in range(start, start + 90, 30):
            d.arc((cx - radius, cy - radius, cx + radius, cy + radius), s, s + 18, fill=color, width=width)


def main():
    img = Image.new('RGBA', (W, H), NAVY + (255,))
    glow(img, (980, 420), 330, GOLD, 70)
    glow(img, (90, 0), 300, CHAR['booker'], 90)
    glow(img, (640, 680), 260, CHAR['lumi'], 55)
    d = ImageDraw.Draw(img)
    dashed_round_rect(d, (16, 16, W - 16, H - 16), 26, (255, 255, 255, 52), 3)

    # stage: an oval felt platform under the friends
    stage = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stage)
    sx0, sy0, sx1, sy1 = 596, 486, 1172, 590
    sd.ellipse((sx0, sy0 + 10, sx1, sy1 + 10), fill=(4, 20, 27, 150))
    sd.ellipse((sx0, sy0, sx1, sy1), fill=NAVY2 + (255,), outline=GOLD + (255,), width=5)
    sd.ellipse((sx0 + 16, sy0 + 12, sx1 - 16, sy1 - 12), outline=(255, 255, 255, 70), width=2)
    img.alpha_composite(stage)

    # the four official cut-outs, same scale (Bop is the tallest model), facing into the page, never flipped
    heights = {'booker': 282, 'lumi': 282, 'zuri': 270, 'bop': 288}
    xs = {'booker': 636, 'lumi': 758, 'zuri': 866, 'bop': 966}
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cuts = []
    for k in ['booker', 'lumi', 'bop', 'zuri']:          # Zuri is the shortest, so she stands in front
        c = Image.open(P('img', f'cut_{k}.webp')).convert('RGBA')
        h = heights[k]
        c = c.resize((round(c.width * h / c.height), h), Image.LANCZOS)
        x, y = xs[k] - 20, 556 - h
        sh = Image.new('RGBA', c.size, (0, 0, 0, 0))
        sh.putalpha(c.getchannel('A').point(lambda a: int(a * 0.45)))
        shadow.alpha_composite(sh, (x + 8, y + 12))
        cuts.append((c, x, y))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(9)))
    for c, x, y in cuts:
        img.alpha_composite(c, (x, y))

    # wordmark: the plush Futures Friends logo (the hero title's art, owner 2026-10-07), untouched
    wm = Image.open(P('img', 'brand', 'ff-plush-wordmark-640.png')).convert('RGBA')
    ww = 480
    wm = wm.resize((ww, round(wm.height * ww / wm.width)), Image.LANCZOS)
    img.alpha_composite(wm, (52, 64))

    # one live line, set in Fredoka like the site
    d = ImageDraw.Draw(img)
    f1, f2 = font(42), font(25)
    y = 64 + wm.height + 30
    d.text((66, y), 'Early learning for ages 2 to 5', font=f1, fill=CREAM)
    d.rounded_rectangle((66, y + 74, 66 + 86, y + 80), radius=3, fill=GOLD)
    d.text((66, y + 98), 'With Booker, Lumi, Zuri and Bop', font=f2, fill=(244, 248, 249, 220))

    os.makedirs(P('img', 'og'), exist_ok=True)
    out = P('img', 'og', 'ff-share-default.png')
    img.convert('RGB').save(out, optimize=True)
    print(out, os.path.getsize(out), 'bytes')


if __name__ == '__main__':
    main()
