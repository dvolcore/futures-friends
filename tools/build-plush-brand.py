#!/usr/bin/env python3
"""Build the PLUSH Futures Friends brand files the site uses wherever the program logo appears (owner 2026-10-07: "All of the
Futures Friends logos need to be that plush, including the one on the page in the top left corner").

Sources (the approved plush logo, same art as the home hero title):
  - the plush wordmark master   05_Brand_and_Art/plush-masters/hero/plush-logo.png (1470 x 696, transparent)
  - its letter sprites + badge   05_Brand_and_Art/plush-generated/wave8/hero-logo-kit/ (letters-1470/spr_*.png, letterless badge)
Falls back to the shipped img/plush/hero/plush-logo-960.webp when the master folder is not on this machine (wordmark only).

Outputs (img/brand/):
  ff-plush-wordmark-{160,320,640}.webp   the wordmark trimmed to its art: header 1x/2x, footer / menu / certificates 2x
  ff-plush-wordmark-640.png              the same for print tools and anything that cannot take webp
  ff-plush-mark-96.webp                  the mark for small UI uses (sample notifications)
  ff-plush-mark-512.png                  the square plush "FF" mark (blue F + cream F on navy felt): app icon, notifications
  ../favicon.png (64), ../favicon-32.png, ../apple-touch-icon.png (180)   the mark at icon sizes

    python3 tools/build-plush-brand.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
ART = os.path.expanduser('~/Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art')
MASTER = os.path.join(ART, 'plush-masters/hero/plush-logo.png')
KIT = os.path.join(ART, 'plush-generated/wave8/hero-logo-kit')


def trimmed(im, pad=2):
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    x0, y0, x1, y1 = box
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def wordmark():
    src = Image.open(MASTER if os.path.exists(MASTER) else P('img/plush/hero/plush-logo-960.webp')).convert('RGBA')
    wm = trimmed(src)
    for w in (160, 320, 640):
        h = round(wm.height * w / wm.width)
        out = wm.resize((w, h), Image.LANCZOS)
        if w <= 320:   # a touch of sharpening keeps the stitching readable at header size
            rgb = out.convert('RGB').filter(ImageFilter.UnsharpMask(radius=0.8, percent=60, threshold=2))
            rgb.putalpha(out.getchannel('A'))
            out = rgb
        f = P('img/brand', f'ff-plush-wordmark-{w}.webp')
        out.save(f, 'WEBP', quality=88 if w <= 320 else 84, method=6, alpha_quality=90)
        print(f, out.size, os.path.getsize(f), 'bytes')
        if w == 640:
            g = P('img/brand', 'ff-plush-wordmark-640.png')
            out.save(g, optimize=True)
            print(g, out.size, os.path.getsize(g), 'bytes')


def rounded(size, r):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), radius=r, fill=255)
    return m


def clean_sprite(path, height):
    # the kit sprites carry the badge's navy contact shadow baked in; keep only the fabric and give it a fresh soft shadow
    import numpy as np
    sp = Image.open(path).convert('RGBA')
    sp = sp.resize((round(sp.width * height / sp.height), height), Image.LANCZOS)
    a = np.asarray(sp).astype(np.float32)
    lum = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
    navy = (a[..., 2] > a[..., 0] + 25) & (lum < 70)
    keep = (a[..., 3] > 40) & ~navy
    m = Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.1))
    pad = 40
    out = Image.new('RGBA', (sp.width + pad * 2, sp.height + pad * 2), (0, 0, 0, 0))
    shadow = Image.new('RGBA', out.size, (2, 8, 24, 0))
    sm = Image.new('L', out.size, 0)
    sm.paste(m, (pad + 6, pad + 12))
    shadow.putalpha(sm.filter(ImageFilter.GaussianBlur(12)).point(lambda v: int(v * .65)))
    out.alpha_composite(shadow)
    fab = sp.copy()
    fab.putalpha(m)
    out.alpha_composite(fab, (pad, pad))
    return out


def mark():
    if not os.path.exists(KIT):
        print('kit not found, mark skipped')
        return
    S = 1024
    badge = Image.open(os.path.join(KIT, 'plush-logo-badge-without-letters-1470.png')).convert('RGBA')
    # navy felt from the middle of the letterless badge (where the letters sat), scaled to the tile
    felt = badge.crop((300, 130, 640, 470)).resize((S, S), Image.LANCZOS)
    tile = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    radius = round(S * .22)
    tile.paste(felt, (0, 0), rounded(S, radius))
    # a cream felt rim and a stitched line inside it, like the badge's edge
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle((10, 10, S - 11, S - 11), radius=radius - 10, outline=(246, 236, 218, 255), width=34)
    inset = 66
    rr = radius - inset + 10
    x0, y0, x1, y1 = inset, inset, S - inset, S - inset
    dash, gap, col = 30, 22, (247, 204, 62, 255)
    for (a, b, horiz, fixed) in [(x0 + rr, x1 - rr, True, y0), (x0 + rr, x1 - rr, True, y1), (y0 + rr, y1 - rr, False, x0), (y0 + rr, y1 - rr, False, x1)]:
        p = a
        while p < b:
            q = min(p + dash, b)
            d.line(((p, fixed), (q, fixed)) if horiz else ((fixed, p), (fixed, q)), fill=col, width=9)
            p = q + gap
    # rim shading: a soft inner shadow so the rim reads as raised felt
    sh = Image.new('L', (S, S), 0)
    ImageDraw.Draw(sh).rounded_rectangle((44, 44, S - 45, S - 45), radius=radius - 44, outline=150, width=10)
    sh = sh.filter(ImageFilter.GaussianBlur(9))
    shade = Image.new('RGBA', (S, S), (4, 14, 40, 0))
    shade.putalpha(Image.composite(sh, Image.new('L', (S, S), 0), rounded(S, radius)))
    tile.alpha_composite(shade)
    # the two plush Fs (FUTURES' blue F, FRIENDS' cream F), same height, the cream one a step lower like the logo
    hgt = 560
    f1 = clean_sprite(os.path.join(KIT, 'letters-1470/spr_F1.png'), hgt)
    f2 = clean_sprite(os.path.join(KIT, 'letters-1470/spr_F2.png'), 510)
    ov = 80 + 36                                  # the two sprite pads + the letters' own overlap
    pair = Image.new('RGBA', (f1.width + f2.width - ov, f1.height + 60), (0, 0, 0, 0))
    pair.alpha_composite(f1, (0, 0))
    pair.alpha_composite(f2, (f1.width - ov, 58))
    bx0, by0, bx1, by1 = pair.getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()   # centre on the letters, not their soft shadows
    top = 170
    tile.alpha_composite(pair, ((S - (bx1 - bx0)) // 2 - bx0, top - by0))
    hearts = Image.open(os.path.join(KIT, 'letters-1470/spr_heart.png')).convert('RGBA')
    hearts = hearts.resize((140, round(hearts.height * 140 / hearts.width)), Image.LANCZOS)
    tile.alpha_composite(hearts, ((S - hearts.width) // 2, top + (by1 - by0) + 28))
    out = P('img/brand', 'ff-plush-mark-512.png')
    tile.resize((512, 512), Image.LANCZOS).save(out, optimize=True)
    print(out, os.path.getsize(out), 'bytes')
    small = P('img/brand', 'ff-plush-mark-96.webp')     # small UI uses (the sample phone notifications)
    tile.resize((96, 96), Image.LANCZOS).save(small, 'WEBP', quality=86, method=6)
    print(small, os.path.getsize(small), 'bytes')
    for size, name in ((64, 'favicon.png'), (32, 'favicon-32.png'), (180, 'apple-touch-icon.png')):
        im = tile.resize((size, size), Image.LANCZOS)
        if name == 'apple-touch-icon.png':      # iOS draws its own rounded corners: a full square, navy behind the corners
            bg = Image.new('RGBA', (size, size), (24, 40, 92, 255))
            bg.alpha_composite(im)
            im = bg
        if size <= 64:
            rgb = im.convert('RGB').filter(ImageFilter.UnsharpMask(radius=0.6, percent=70, threshold=1))
            rgb.putalpha(im.getchannel('A'))
            im = rgb
        f = P('img', name)
        im.save(f, optimize=True)
        print(f, im.size, os.path.getsize(f), 'bytes')


if __name__ == '__main__':
    wordmark()
    mark()
