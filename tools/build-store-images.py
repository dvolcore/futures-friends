#!/usr/bin/env python3
"""Futures Friends store: build QC'd product pictures (full product, even margin, nothing touching an edge).

Reads the owner's merchandise campaign package and writes <product-id>-<n>.png masters into an output folder; then run
    node tools/import-store-images.mjs <out> --merge
to make the 400/800/1200 WebP + JPG files and img/store/manifest.json.

Classes (aspect is kept uniform per class so cards blend):
  plush      n=1 hero (Single_Shot_Dolls, trimmed + padded, 3:4), n=2 the whole turnaround board (copied as is),
             n=3/4/5 the front / side / back panels of the board, cut inside the divider lines, trimmed, padded (3:4, margin >= 7.5%)
  hoodie     the front+back composite trimmed and padded onto its own background (3:2, margin 7%)
  rugs       trimmed to the whole rug incl. its border and padded (2:3 portrait); square rugs are cut off the wood floor and set on cream with a soft shadow (1:1)
  posters    the real poster artwork shown full with a margin and a soft shadow (2:3)
  new merch  stickers, coloring books, bottles, plate, replica backpacks: trimmed, then padded
  scenes     bundle / collection heroes (group shots), rebuilt from the product pictures with margins
Usage: python3 tools/build-store-images.py <outDir> [photosDir-with-existing-tshirt-split-masters]
"""
import os, sys, json, glob
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

PKG = os.path.expanduser('~/Downloads/Futures_Friends_Merchandise_Campaign_2026-10-07/')
OUT = os.path.expanduser(sys.argv[1]) if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/store_photos_qc')
os.makedirs(OUT, exist_ok=True)
CREAM = (248, 241, 230)
M_PLUSH = 0.08


def load(p): return np.asarray(Image.open(p).convert('RGB'))
def corner_bg(a, k=8):
    c = np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3), a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3)])
    return np.median(c, 0)


def content_bbox(a, bg=None, thr=50):
    if bg is None: bg = corner_bg(a)
    d = np.abs(a.astype(int) - bg).sum(2) > thr
    d = nd.binary_opening(d, iterations=2)
    ys, xs = np.where(d)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def ramp(h, w, e):
    """alpha that is 1 inside and fades to 0 over the outer e pixels"""
    if e <= 0: return np.ones((h, w))
    yy = np.minimum(np.arange(h), np.arange(h)[::-1])[:, None]
    xx = np.minimum(np.arange(w), np.arange(w)[::-1])[None, :]
    t = np.clip(np.minimum(yy, xx) / float(e), 0, 1)
    return t * t * (3 - 2 * t)


def trimmed(a, bg=None, thr=50, e=None):
    """content bbox plus an e-px margin of background on every side (padded with the bg colour when the content touches the source edge)"""
    if bg is None: bg = corner_bg(a)
    x0, y0, x1, y1 = content_bbox(a, bg, thr)
    bw, bh = x1 - x0, y1 - y0
    if e is None: e = max(6, int(0.04 * max(bw, bh)))
    pad = np.empty((a.shape[0] + 2 * e, a.shape[1] + 2 * e, 3), a.dtype); pad[:] = np.round(bg).astype(a.dtype)
    pad[e:e + a.shape[0], e:e + a.shape[1]] = a
    crop = pad[y0:y1 + 2 * e, x0:x1 + 2 * e]
    return crop, (bw, bh), e, bg


def canvas_for(bw, bh, ratio, margin):
    W = max(bw / (1 - 2 * margin), bh * ratio / (1 - 2 * margin)); H = W / ratio
    return int(round(W)), int(round(H))


def paste(cv, crop, cx, cy, e, alpha=None):
    """paste crop (which carries e px of bg margin, faded) centred at (cx,cy); cv is a float array"""
    h, w = crop.shape[:2]
    x = int(round(cx - w / 2)); y = int(round(cy - h / 2))
    al = ramp(h, w, e) if alpha is None else alpha
    sx0, sy0 = max(0, -x), max(0, -y); sx1, sy1 = min(w, cv.shape[1] - x), min(h, cv.shape[0] - y)
    reg = cv[y + sy0:y + sy1, x + sx0:x + sx1]
    a3 = al[sy0:sy1, sx0:sx1, None]
    reg[:] = reg * (1 - a3) + crop[sy0:sy1, sx0:sx1] * a3


def place(a, ratio, margin, bg=None, thr=50, canvas_bg=None):
    crop, (bw, bh), e, bgc = trimmed(a, bg, thr)
    W, H = canvas_for(bw, bh, ratio, margin)
    cb = np.array(canvas_bg if canvas_bg is not None else bgc, float)
    cv = np.empty((H, W, 3), float); cv[:] = cb
    paste(cv, crop.astype(float), W / 2, H / 2, e)
    return Image.fromarray(np.clip(np.round(cv), 0, 255).astype('uint8'))


def save(img, pid, n):
    img.save(os.path.join(OUT, f'{pid}-{n}.png'), optimize=True)
    print(f'  {pid}-{n}', img.size)


def shadow_layer(mask, dy, blur, strength, size):
    h, w = size
    m = np.zeros((h, w)); m[:mask.shape[0], :mask.shape[1]] = mask
    s = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(blur))
    s = np.roll(np.asarray(s).astype(float) / 255 * strength, dy, axis=0)
    return s


# ----------------------------------------------------------------------------- plush
def find_dividers(a, n=3):
    H, W, _ = a.shape
    cm = a.astype(float).mean(0); sm = nd.median_filter(cm, size=(41, 1)); dev = np.abs(cm - sm).sum(1)
    out = []
    for i in range(1, n):
        c = W * i / n; lo, hi = int(c - W * 0.07), int(c + W * 0.07)
        x = lo + int(np.argmax(dev[lo:hi])); pk = dev[x]
        l = x
        while l > lo and dev[l - 1] > 0.35 * pk: l -= 1
        r = x
        while r < hi and dev[r + 1] > 0.35 * pk: r += 1
        out.append((l, r, float(pk)))
    return out


def split_panels(a, n=3):
    """panel x-ranges cut in the empty gaps near the thirds, so no figure is ever cut; divider lines are returned for blanking"""
    H, W, _ = a.shape
    bg = corner_bg(a)
    d = nd.binary_opening(np.abs(a.astype(int) - bg).sum(2) > 50, iterations=2)
    dv = [(l, r) for l, r, pk in find_dividers(a, n) if pk > 10]
    for l, r in dv: d[:, max(0, l - 6):r + 7] = False
    mass = d.sum(0); cuts = []
    for i in range(1, n):
        c = int(W * i / n); lo, hi = int(c - W * 0.08), int(c + W * 0.08); seg = mass[lo:hi] == 0; best = None; x = 0
        while x < len(seg):
            if seg[x]:
                y = x
                while y < len(seg) and seg[y]: y += 1
                sc = (y - x) - abs((x + y) / 2 - (c - lo)) * 0.05
                if best is None or sc > best[0]: best = (sc, x, y)
                x = y
            else: x += 1
        if best is None: raise RuntimeError('no empty gap near the divider at %d' % c)
        cuts.append(lo + (best[1] + best[2]) // 2)
    xs = [0] + cuts + [W]
    return [(xs[i], xs[i + 1]) for i in range(n)], dv, bg


def build_plush():
    print('plush')
    for k in ['bop', 'zuri', 'booker', 'lumi']:
        pid = f'plush-{k}'
        save(place(load(PKG + f'Single_Shot_Dolls/{k}-plush.png'), 0.75, M_PLUSH), pid, 1)
        Image.open(PKG + f'plush/{k}-turnaround.png').convert('RGB').save(os.path.join(OUT, f'{pid}-2.png'))
        a = load(PKG + f'plush/{k}-turnaround.png')
        pan, dv, bg = split_panels(a)
        for i, (x0, x1) in enumerate(pan):
            p = a[:, x0:x1].copy()
            for l, r in dv:
                lo, hi = max(l - 6, x0) - x0, min(r + 7, x1) - x0
                if hi > lo: p[:, lo:hi] = np.round(bg).astype(p.dtype)
            save(place(p, 0.75, M_PLUSH, bg=bg), pid, 3 + i)


# ----------------------------------------------------------------------------- apparel
def build_hoodies():
    print('hoodies')
    for k in ['booker', 'lumi', 'zuri', 'bop', 'all-friends']:
        save(place(load(PKG + f'apparel/images/{k}-hoodie.png'), 1.5, 0.07), f'{k}-hoodie', 1)


# ----------------------------------------------------------------------------- rugs
def build_rugs():
    print('rugs')
    for k, pid in [('booker', 'rug-booker-reading-area'), ('lumi', 'rug-lumi-calm-corner'), ('zuri', 'rug-zuri-discovery-zone'),
                   ('bop', 'rug-bop-movement-zone'), ('friends-circle', 'rug-friends-circle')]:
        save(place(load(PKG + f'carpets/{k}-carpet.png'), 2 / 3, 0.07, thr=40), pid, 1)
    zone = {'booker': 'booker-reading-area', 'lumi': 'lumi-calm-corner', 'zuri': 'zuri-discovery-zone', 'bop': 'bop-movement-zone', 'friends-circle': 'friends-circle'}
    for k, z in zone.items():
        a = load(PKG + f'carpets/square/{k}-square-carpet.png'); f = a.astype(float) / 255
        ring = np.concatenate([f[:6].reshape(-1, 3), f[-6:].reshape(-1, 3), f[:, :6].reshape(-1, 3), f[:, -6:].reshape(-1, 3)])
        m = np.abs(f - np.median(ring, 0)).sum(2) > 0.45
        m = nd.binary_fill_holes(nd.binary_opening(m, iterations=3))
        lab, n = nd.label(m); s = nd.sum(m, lab, range(1, n + 1)); m = lab == (1 + np.argmax(s))
        ys, xs = np.where(m); x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        e = 24
        crop = a[max(0, y0 - e):y1 + e, max(0, x0 - e):x1 + e]
        mk = m[max(0, y0 - e):y1 + e, max(0, x0 - e):x1 + e].astype(float)
        mk = np.asarray(Image.fromarray((mk * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.1))).astype(float) / 255
        bw, bh = x1 - x0, y1 - y0
        W, H = canvas_for(bw, bh, 1.0, 0.08)
        cv = np.empty((H, W, 3), float); cv[:] = (251, 244, 234)
        ch, cw = mk.shape
        ox, oy = (W - cw) // 2, (H - ch) // 2
        sh = shadow_layer(mk, int(0.012 * H), 0.012 * H, 0.30, (ch, cw))
        reg = cv[oy:oy + ch, ox:ox + cw]; reg[:] = reg * (1 - sh[..., None]) + np.array([60, 45, 30]) * sh[..., None]
        reg[:] = reg * (1 - mk[..., None]) + crop * mk[..., None]
        save(Image.fromarray(np.clip(np.round(cv), 0, 255).astype('uint8')), f'rug-square-{z}', 1)


# ----------------------------------------------------------------------------- posters
def poster_on_paper(src, W=1100, H=1650, margin=0.07):
    im = Image.open(src).convert('RGB')
    pw = int(W * (1 - 2 * margin)); ph = int(round(pw * im.height / im.width))
    if ph > H * (1 - 2 * margin): ph = int(H * (1 - 2 * margin)); pw = int(round(ph * im.width / im.height))
    im = im.resize((pw, ph), Image.LANCZOS)
    cv = np.empty((H, W, 3), float); cv[:] = (247, 242, 233)
    ox, oy = (W - pw) // 2, (H - ph) // 2 - int(0.004 * H)
    mk = np.ones((ph, pw))
    sh = np.zeros((H, W)); sh[oy:oy + ph, ox:ox + pw] = 1
    sh = np.asarray(Image.fromarray((sh * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.012 * H))).astype(float) / 255 * 0.32
    sh = np.roll(sh, int(0.012 * H), axis=0)
    cv = cv * (1 - sh[..., None]) + np.array([70, 55, 40]) * sh[..., None]
    cv[oy:oy + ph, ox:ox + pw] = np.asarray(im)
    return Image.fromarray(np.clip(np.round(cv), 0, 255).astype('uint8'))


def build_posters():
    print('posters')
    zones = {'booker': 'booker-reading-area', 'lumi': 'lumi-calm-corner', 'zuri': 'zuri-discovery-zone', 'bop': 'bop-movement-zone', 'friends-circle': 'friends-circle'}
    for k, z in zones.items():
        save(poster_on_paper(PKG + f'posters/{k}-poster-a.png'), f'poster-{z}-v1', 1)
        save(poster_on_paper(PKG + f'posters/{k}-poster-b.png'), f'poster-{z}-v2', 1)


# ----------------------------------------------------------------------------- new merch
def build_new_merch():
    print('new merch')
    CS = PKG + 'coloring-stickers/images/'
    for k in ['booker', 'lumi', 'zuri', 'bop']:
        save(place(load(CS + f'{k}-coloring-book.png'), 1.5, 0.07), f'coloring-book-{k}', 1)
        save(place(load(CS + f'{k}-insulated-bottle.png'), 2 / 3, 0.07), f'bottle-{k}', 1)
    for k, pid in [('booker', 'stickers-booker'), ('lumi', 'stickers-lumi'), ('zuri', 'stickers-zuri'), ('bop', 'stickers-bop'), ('all-friends', 'stickers-all-friends')]:
        save(place(load(CS + f'{k}-stickers.png'), 2 / 3, 0.06, thr=40), pid, 1)
    for i, k in enumerate(['lead-friends', 'classmates', 'families', 'school'], 1):
        save(place(load(CS + f'universe-coloring-{k}.png'), 2 / 3, 0.06, thr=40), 'coloring-book-universe', i)
        save(place(load(CS + f'universe-stickers-{k}.png'), 2 / 3, 0.06, thr=40), 'stickers-universe', i)
    save(place(load(CS + 'eat-the-rainbow-plate.png'), 1.25, 0.08), 'eat-the-rainbow-plate', 1)
    for k in ['booker', 'bop', 'zuri']:
        save(place(load(PKG + f'apparel/images/{k}-replica-backpack.png'), 2 / 3, 0.07), f'{k}-replica-backpack', 1)
        # n=2: the friend wearing it (the single-shot doll), the "worn by" story picture on the product page
        save(place(load(PKG + f'Single_Shot_Dolls/{k}-plush.png'), 2 / 3, 0.07), f'{k}-replica-backpack', 2)


# ----------------------------------------------------------------------------- scenes (bundles / collections)
def row_scene(items, W, H, bg, gap_frac=0.022, margin=0.06, thr=50, shadow=False):
    """items: list of RGB arrays; each is trimmed, scaled to one height, laid in a row on bg with even margins"""
    tr = [trimmed(a, None, thr, e=28) for a in items]
    inner_h = H * (1 - 2 * margin)
    sc = [inner_h / (t[1][1] + 56) for t in tr]
    widths = [(t[1][0] + 56) * s for t, s in zip(tr, sc)]
    gap = gap_frac * W
    tot = sum(widths) + gap * (len(items) - 1)
    if tot > W * (1 - 2 * margin):
        f = W * (1 - 2 * margin) / tot; sc = [s * f for s in sc]; widths = [w * f for w in widths]; gap *= f; tot *= f; inner_h *= f
    cv = np.empty((H, W, 3), float); cv[:] = bg
    x = (W - tot) / 2
    for (crop, (bw, bh), e, tbg), s, w in zip(tr, sc, widths):
        im = Image.fromarray(crop).resize((max(1, int(round(crop.shape[1] * s))), max(1, int(round(crop.shape[0] * s)))), Image.LANCZOS)
        ar = np.asarray(im).astype(float)
        paste(cv, ar, x + w / 2, H / 2, int(e * s) + 1)
        x += w + gap
    return Image.fromarray(np.clip(np.round(cv), 0, 255).astype('uint8'))


def build_scenes():
    print('scenes')
    # plush group (cream studio): trim + pad
    g = load(PKG + 'plush/all-four-plush.png')
    for pid in ('collection-plush', 'bundle-character-merchandising-kit'):
        save(place(g, 16 / 9, 0.05), pid, 1)
    # carpets on the wood floor: whole rugs already sit inside the frame; keep as scenes (whitelisted in the audit after review)
    c5 = Image.open(PKG + 'carpets/all-five-carpets.png').convert('RGB')
    save(c5, 'bundle-complete-learning-zones', 1); save(c5, 'collection-carpets', 1)
    save(Image.open(PKG + 'carpets/square/all-five-square-carpets.png').convert('RGB'), 'collection-carpets', 2)
    # four-zone starter: first four rugs only; cut in the floor gap before Friends Circle, then extend the floor with its own boards
    a = np.asarray(c5)
    bg = a[: int(a.shape[0] * 0.05)].reshape(-1, 3)   # top floor strip is rug free
    d = np.abs(a.astype(int) - np.median(bg, 0)).sum(2) > 70
    d = nd.binary_opening(d, iterations=3)
    cols = d.sum(0); rug = cols > a.shape[0] * 0.30
    runs = []; x = 0
    while x < len(rug):
        if rug[x]:
            y = x
            while y < len(rug) and rug[y]: y += 1
            if y - x > 80: runs.append((x, y))
            x = y
        else: x += 1
    assert len(runs) == 5, runs
    cut = (runs[3][1] + runs[4][0]) // 2
    left = a[:, :cut]; padw = runs[0][0]
    strip = np.repeat(left[:, -1:], padw, axis=1)
    img = np.concatenate([left, strip], 1)
    save(Image.fromarray(img), 'bundle-four-zone-starter', 1)
    # collection heroes: rows of product pictures on cream
    zones = ['booker', 'lumi', 'friends-circle', 'zuri', 'bop']
    save(row_scene([load(PKG + f'posters/{k}-poster-a.png') for k in zones], 2000, 1000, (247, 242, 233), thr=50), 'collection-posters', 1)
    # apparel: the t-shirt fronts (the split, padded garment pictures already in img/store)
    site = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    tees = [load(os.path.join(site, f'img/store/{k}-tshirt-1-768.jpg')) for k in ['booker', 'lumi', 'all-friends', 'zuri', 'bop']]
    save(row_scene(tees, 2000, 1000, (251, 246, 239), thr=40), 'collection-apparel', 1)
    # drinkware and stickers: from this run's own masters
    o = lambda pid, n=1: load(os.path.join(OUT, f'{pid}-{n}.png'))
    save(row_scene([o(f'bottle-{k}') for k in ['booker', 'lumi', 'zuri', 'bop']] + [o('eat-the-rainbow-plate')], 2000, 1000, (248, 243, 233), thr=40), 'collection-drinkware', 1)
    save(row_scene([o(f'stickers-{k}') for k in ['booker', 'lumi', 'zuri', 'bop', 'all-friends']], 2000, 1000, (248, 243, 233), thr=40), 'collection-stickers', 1)


def main():
    build_plush(); build_hoodies(); build_rugs(); build_posters(); build_new_merch(); build_scenes()


if __name__ == '__main__':
    main()
