#!/usr/bin/env python3
"""Traces the Futures Learning Center shield (img/brand/flc-mark-rev.png and flc-mark.png, 256 x 318) into layered vector paths
for flc-mark.js (wave 9). Run from the site root:  python3 tools/trace-flc-mark.py  [--check]

How: each PNG pixel is unmixed into its brand colours (rev: cream, gold, transparent; regular: ink, arm navy, white, gold), each
layer gets a coverage map (a layer also counts the layers painted over it, so stacked shapes never leave a seam), the map is
upsampled 8x with cubic interpolation (sub-pixel edges) and thresholded at 50 %, and potrace fits Bezier curves to it. The result
is written between the PATHS markers in flc-mark.js. Also derived here: the shield's centre line (both halves, top gap to the
bottom point) and the arrow's spine, which the draw-on and sweep masks follow. Needs numpy, scipy, Pillow and potrace."""
import json, os, re, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
W, H, K = 256, 318, 8
SMOOTH = float(os.environ.get('FLC_SMOOTH', '6'))
CREAM, GOLD = (251, 246, 236), (202, 148, 12)
INK, ARM, WHITE = (6, 40, 52), (2, 35, 66), (252, 251, 252)


def load(name):
    a = np.asarray(Image.open(os.path.join(ROOT, 'img/brand', name)).convert('RGBA')).astype(float)
    return a[..., :3], a[..., 3] / 255.0


def unmix(rgb, alpha, palette):
    """Per pixel: the best two-colour blend of the palette (or a single colour); returns one fraction map per palette colour."""
    P = np.array(palette, float)
    n = len(P)
    best = np.full(rgb.shape[:2], np.inf)
    frac = np.zeros(rgb.shape[:2] + (n,))
    for i in range(n):
        for j in range(n):
            if j < i:
                continue
            d = P[i] - P[j]
            dd = float(d @ d)
            t = np.ones(rgb.shape[:2]) if dd == 0 else np.clip(((rgb - P[j]) @ d) / dd, 0, 1)
            mix = t[..., None] * P[i] + (1 - t[..., None]) * P[j]
            r = ((rgb - mix) ** 2).sum(-1)
            m = r < best
            best[m] = r[m]
            f = np.zeros(rgb.shape[:2] + (n,))
            f[..., i] += t
            f[..., j] += 1 - t
            frac[m] = f[m]
    return frac * alpha[..., None]


def up(cov, sg=None):
    # cubic upsample, then a light blur (FLC_SIGMA upsampled px) that irons out the one-pixel ripple a thresholded cubic leaves on
    # slanted edges (otherwise potrace faithfully traces hundreds of 0.4 px wiggles)
    z = ndi.zoom(cov, K, order=3, grid_mode=True, mode='grid-constant', cval=0.0)
    sg = float(os.environ.get('FLC_SIGMA', '3')) if sg is None else sg
    return ndi.gaussian_filter(z, sg) if sg > 0 else z


def potrace(bitmap):
    """bitmap: bool array (K-upsampled). Returns an SVG path d in source-pixel units (absolute start, relative curves)."""
    h, w = bitmap.shape
    with tempfile.TemporaryDirectory() as td:
        pbm, svg = os.path.join(td, 'l.pbm'), os.path.join(td, 'l.svg')
        Image.fromarray((~bitmap).astype(np.uint8) * 255).convert('1').save(pbm)
        subprocess.run(['potrace', pbm, '-s', '-o', svg, '-t', os.environ.get('FLC_T', '4'), '-a', os.environ.get('FLC_A', '1.0'), '-O', os.environ.get('FLC_O', '2'), '-u', '10'], check=True)
        text = open(svg).read()
    ds = re.findall(r'<path d="([^"]+)"', text)
    toks = re.findall(r'[MmLlCcZz]|-?\d+(?:\.\d+)?', ' '.join(ds))
    # potrace: y up, units of 0.1 px of the upsampled bitmap
    tx = lambda x: x * 0.1 / K
    ty = lambda y: (h - y * 0.1) / K
    out, i, cmd = [], 0, None
    cx = cy = sx = sy = 0.0
    last = None  # last emitted absolute point, rounded

    def R(v):
        return round(v, 2)

    def fmt(v):
        s = ('%.2f' % v).rstrip('0').rstrip('.')
        s = s.replace('0.', '.', 1) if s.startswith('0.') else (s.replace('-0.', '-.', 1) if s.startswith('-0.') else s)
        return '0' if s in ('', '-0', '-') else s

    def nums(seq):
        o = ''
        for v in seq:
            s = fmt(v)
            o += s if not o or s[0] == '-' or (s[0] == '.' and '.' in o.split(' ')[-1].split('-')[-1]) else ' ' + s
        return o

    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t
            i += 1
            if cmd in 'Zz':
                out.append('z')
                cx, cy = sx, sy
                last = (R(tx(sx)), R(ty(sy)))
                continue
        n = {'M': 2, 'm': 2, 'L': 2, 'l': 2, 'C': 6, 'c': 6}[cmd]
        v = [float(x) for x in toks[i:i + n]]
        i += n
        rel = cmd.islower()
        if cmd in 'Mm':
            if rel:
                cx, cy = cx + v[0], cy + v[1]
            else:
                cx, cy = v
            sx, sy = cx, cy
            p = (R(tx(cx)), R(ty(cy)))
            if last is None:
                out.append('M' + nums(p))
            else:
                out.append('m' + nums((p[0] - last[0], p[1] - last[1])))
            last = p
            cmd = 'l' if rel else 'L'
        elif cmd in 'Ll':
            cx, cy = (cx + v[0], cy + v[1]) if rel else (v[0], v[1])
            p = (R(tx(cx)), R(ty(cy)))
            out.append('l' + nums((p[0] - last[0], p[1] - last[1])))
            last = p
        else:
            pts = [(cx + v[k], cy + v[k + 1]) if rel else (v[k], v[k + 1]) for k in (0, 2, 4)]
            cx, cy = pts[2]
            P = [(R(tx(a)), R(ty(b))) for a, b in pts]
            out.append('c' + nums([q for pt in P for q in (pt[0] - last[0], pt[1] - last[1])]))
            last = P[2]
    return ''.join(out)


def trace(cov, sg=None, thr=0.5):
    return potrace(up(cov, sg) >= thr)


def main():
    rgb_r, a_r = load('flc-mark-rev.png')
    rgb_n, a_n = load('flc-mark.png')
    fr = unmix(rgb_r, a_r, [CREAM, GOLD])
    cream, gold = fr[..., 0], fr[..., 1]
    fn = unmix(rgb_n, a_n, [INK, ARM, WHITE, GOLD])
    ink, arm, white, gold_n = fn[..., 0], fn[..., 1], fn[..., 2], fn[..., 3]

    # --- regions (1x). The backpack touches the ring at the lower left, so the ring is found by geometry: the shield's face
    # (everything opaque except the star, star gap bridged, holes filled) and the band within RING px of its outer edge.
    glab, gn = ndi.label(gold > 0.25)
    gsl = ndi.find_objects(glab)
    gsz = ndi.sum(np.ones_like(gold), glab, range(1, gn + 1))
    star_id = 1 + int(np.argmin([s[0].start for s in gsl]))          # the topmost gold piece
    star_m = ndi.binary_dilation(glab == star_id, iterations=2)
    arrow_m = ndi.binary_dilation((glab > 0) & (glab != star_id) & np.isin(glab, 1 + np.where(gsz > 20)[0]), iterations=2)

    body = (a_r > 0.5) & ~star_m
    face = ndi.binary_fill_holes(body | bridge(body))
    depth = ndi.distance_transform_edt(np.pad(face, 2))[2:-2, 2:-2]   # padded: the ring touches the image edge
    RING = 13.5
    ring_m = (depth <= RING) & ~star_m
    core = (cream > 0.5) & (depth > RING)
    lab, n = ndi.label(core)
    sizes = ndi.sum(np.ones_like(cream), lab, range(1, n + 1))
    child_core = np.isin(lab, 1 + np.where(sizes > 8)[0])
    child_m = ndi.binary_dilation(child_core, iterations=3) & ~ndi.binary_dilation(~face, iterations=6)
    shield_m = ndi.binary_dilation(ring_m, iterations=1) & ~star_m
    inside = ndi.binary_fill_holes(ndi.binary_closing(child_core, iterations=2))
    holes_m = ndi.binary_erosion(inside, iterations=1) & ~child_core
    # keep only real drawn lines (arm outline, backpack handle and seams): specks of a pixel or two are compression noise
    hl, hn = ndi.label(ndi.binary_dilation(holes_m, iterations=1) & inside)
    ink = ndi.sum(1 - a_r, hl, range(1, hn + 1))
    holes_m = np.isin(hl, 1 + np.where(ink >= 4.0)[0])
    specks = inside & ~ndi.binary_dilation(holes_m, iterations=1) & ~child_core
    alab, an = ndi.label(child_core)
    asz = ndi.sum(np.ones_like(cream), alab, range(1, an + 1))
    arm_ids = [i + 1 for i in range(an) if asz[i] > 300 and asz[i] < 0.5 * asz.max()]
    arm_core = np.isin(alab, arm_ids)

    # --- coverage per layer (a layer includes whatever is painted over it inside its reach, so stacks are seamless)
    near_arrow = ndi.binary_dilation(arrow_m, iterations=3)
    arrow_cov = np.maximum(gold * arrow_m, cream * child_m * near_arrow)   # the child stands in front of the arrow
    star_cov = gold * star_m
    shield_cov = cream * shield_m
    child_rev = np.maximum(cream * child_m, specks * 1.0)
    hole_cov = (1 - a_r) * holes_m                                     # the fine lines cut through the child (transparent on rev)
    child_solid = np.maximum(child_rev, holes_m * 1.0)
    child_solid = np.maximum(child_solid, hole_cov)
    arm_fill = np.maximum(cream * ndi.binary_dilation(arm_core, iterations=1), hole_cov * ndi.binary_dilation(arm_core, iterations=3))
    arm_fill = arm_fill * ndi.binary_dilation(arm_core, iterations=2)

    paths = {
        # big simple shapes take a stronger ironing (fewer, longer curves); the child and its fine lines keep their detail
        'shield': trace(shield_cov, SMOOTH), 'child': trace(child_rev), 'arrow': trace(arrow_cov, SMOOTH), 'star': trace(star_cov),
        'childSolid': trace(child_solid), 'armFill': trace(arm_fill), 'lines': trace(hole_cov),
        'face': trace(ndi.gaussian_filter(face.astype(float), 0.7), 12),
    }
    ring = shield_cov > 0.5

    # --- guides
    guides = {
        'shieldL': centre_line(ring, -1), 'shieldR': centre_line(ring, 1),
        # the arrow's spine (sweep mask): from the tail under the backpack, behind the child, up through the head. Hand-placed over the
        # traced arrow (checked in the intro strips); flc-mark.js strokes it 84 units wide, which covers the head and the tail.
        'arrowSpine': 'M14 226C70 214 120 206 152 194C178 182 198 156 214 128L244 80',
        'star': [round(float(v), 2) for v in ndi.center_of_mass(star_cov)[::-1]],
        'childBox': box(child_rev > 0.5), 'arrowBox': box(arrow_cov > 0.5), 'starBox': box(star_cov > 0.5),
    }
    data = {'w': W, 'h': H, 'paths': paths, 'guides': guides}
    js_path = os.path.join(ROOT, 'flc-mark.js')
    blob = 'const P = ' + json.dumps(data, separators=(',', ':')) + ';'
    src = open(js_path).read()
    new = re.sub(r'/\* PATHS \*/.*?/\* /PATHS \*/', lambda m: '/* PATHS */' + blob + '/* /PATHS */', src, flags=re.S)
    if '--check' in sys.argv:
        sys.exit(0 if new == src else 1)
    open(js_path, 'w').write(new)
    print({k: len(v) for k, v in paths.items()}, 'bytes of path data', sum(len(v) for v in paths.values()))
    print(json.dumps(guides))


def bridge(ring):
    """The star gap at the top of the ring: a straight band joining the two arm ends so the face can be filled."""
    b = np.zeros_like(ring)
    y0 = np.where(ring.any(1))[0][0]
    band = ring[y0:y0 + 22]                       # only the two top arms live this high (the cap starts lower)
    cols = np.where(band.any(0))[0]
    mid = W // 2
    left_end = max(c for c in cols if c < mid)
    right_end = min(c for c in cols if c > mid)
    yl = y0 + np.where(band[:, left_end])[0]
    yr = y0 + np.where(band[:, right_end])[0]
    for x in range(left_end, right_end + 1):
        t = (x - left_end) / max(1, right_end - left_end)
        ya = int(round(yl[0] + t * (yr[0] - yl[0])))
        yb = int(round(yl[-1] + t * (yr[-1] - yl[-1])))
        b[ya:yb + 1, x] = True
    return b


def centre_line(ring, side):
    """Middle of the ring along rays from the shield's centre; side -1 = left half, 1 = right half; from the top gap to the point."""
    cx, cy = W / 2, 150.0
    pts = []
    for deg in np.arange(0, 180.5, 2.5):
        th = np.radians(deg) * side
        dx, dy = np.sin(th), -np.cos(th)
        rs = np.arange(20, 260, 0.25)
        x, y = cx + dx * rs, cy + dy * rs
        ok = (x >= 0) & (x < W) & (y >= 0) & (y < H)
        hit = np.zeros_like(rs, bool)
        hit[ok] = ring[y[ok].astype(int), x[ok].astype(int)]
        if not hit.any():
            continue
        r = rs[hit].mean()
        pts.append((round(float(cx + dx * r), 1), round(float(cy + dy * r), 1)))
    return simplify(pts, 0.6)


def simplify(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0]), np.array(pts[-1])
    d = b - a
    nrm = np.hypot(*d) or 1
    dist = [abs(d[0] * (p[1] - a[1]) - d[1] * (p[0] - a[0])) / nrm for p in pts[1:-1]]
    i = int(np.argmax(dist)) + 1
    if dist[i - 1] > eps:
        return simplify(pts[:i + 1], eps)[:-1] + simplify(pts[i:], eps)
    return [pts[0], pts[-1]]


def box(m):
    ys, xs = np.where(m)
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


if __name__ == '__main__':
    main()
