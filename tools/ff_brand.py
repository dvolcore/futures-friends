#!/usr/bin/env python3
"""Futures Friends curriculum identity: "the stitched storybook" (wave 10, 2026-10-07).

One module shared by every curriculum generator (tools/make-unit1-packets.py, tools/make-printables.py,
tools/make-curriculum-package.py) so packets, Start Monday bundles, classroom printables, family cards, story sets and the
binder packaging read as one published curriculum. Data, not layout code, decides what each page says; this module only decides
how it looks.

  python3 tools/ff_brand.py --icons     writes img/curriculum/icons.svg (the same icon set the PDFs draw, for the web views)
  python3 tools/ff_brand.py --swatches  prints every token with its CMYK build and text contrast

The system (also written up in DESIGN.md, "Curriculum print system"):
  - Paper: real-world teaching content stays on plain warm paper (#FFFDF8). Felt (a texture derived from the plush art, recoloured
    per friend) is only for story-world surfaces: covers, day and section openers, the thumb-index tab, guide notes, posters.
  - The stitch: a dashed thread line, inset on every felt surface and used as the rule under every heading. It is the curriculum's
    signature, taken from the stitched felt plush logo.
  - Colour codes the lead friend and pillar: Booker (LEARN + SMILE) blue, Lumi (BELONG + RESET) pink, Zuri (EXPLORE + NOURISH)
    green, Bop (MOVE + OUTSIDE) orange. "deep" is the text/ink colour (>= 4.5:1 on paper and tint), "felt" the surface colour.
    All colours sit inside the US web-coated (SWOP) CMYK gamut; the packaging prints them as CMYK builds (see CMYK below).
  - Black-and-white fallback: colour is never the only code. Every block carries its drawn icon and its name; every week carries
    "Week N" and the friend's name; the thumb tab position also encodes the week.
  - Cast in recurring roles (all story-world characters, labelled as such wherever they sit beside real-world teaching content):
    Ms. June = the teacher's voice (teacher notes), Principal Hazel = routines and safety, Mr. Moss = setting up the room and
    supplies, Ms. Fern = art and messy play, classmates = activity examples, each friend's grown-up = the family cards.
  - Characters always stand on a felt-grass strip, share one height unit (manifest lineup_scale) and are never stretched.
"""
import io, json, math, os, sys, tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = tempfile.mkdtemp(prefix='ff-brand-')

# ---------------------------------------------------------------- tokens
PAPER, CREAM, NAVY, INK, MUTED, GOLD, THREAD, LINE = '#FFFDF8', '#FBF6EC', '#0A2B38', '#14313D', '#55666E', '#E7A928', '#FFF3D6', '#E6DCCB'
FRIEND = {
    #          deep (ink, 4.5:1+)  felt (surface)   tint (panel)    thread (stitch on felt)
    'booker': {'deep': '#23589F', 'felt': '#2F67B3', 'tint': '#E9F0FA', 'thread': '#CFE0F6', 'name': 'Booker', 'pillars': 'LEARN + SMILE'},
    'lumi':   {'deep': '#A82A65', 'felt': '#C4467F', 'tint': '#FBEAF2', 'thread': '#F8D3E3', 'name': 'Lumi', 'pillars': 'BELONG + RESET'},
    'zuri':   {'deep': '#1B6E3E', 'felt': '#2E8452', 'tint': '#E7F4EC', 'thread': '#CDEBD8', 'name': 'Zuri', 'pillars': 'EXPLORE + NOURISH'},
    'bop':    {'deep': '#9C4507', 'felt': '#B5541A', 'tint': '#FCEEE2', 'thread': '#F9D9BF', 'name': 'Bop', 'pillars': 'MOVE + OUTSIDE'},
    'gold':   {'deep': '#6E4C00', 'felt': '#D99A22', 'tint': '#FBF1D8', 'thread': '#FFF0C9', 'name': 'Futures Friends', 'pillars': ''},
    'navy':   {'deep': NAVY, 'felt': '#173F52', 'tint': '#EAF0F2', 'thread': '#C9DCE3', 'name': 'Futures Friends', 'pillars': ''},
}
KEYS = ['booker', 'lumi', 'zuri', 'bop']

# CMYK builds for the press (packaging); converted with a GCR curve and checked against SWOP coverage (max 300% total ink).
CMYK = {
    NAVY: (95, 62, 42, 55), GOLD: (0, 30, 92, 4), PAPER: (0, 1, 3, 0), CREAM: (0, 2, 6, 1),
    '#2F67B3': (86, 52, 0, 4), '#23589F': (90, 60, 2, 10), '#C4467F': (12, 85, 18, 2), '#A82A65': (18, 95, 30, 10),
    '#2E8452': (82, 18, 85, 8), '#1B6E3E': (88, 25, 92, 22), '#B5541A': (14, 74, 100, 8), '#9C4507': (20, 78, 100, 18),
    '#D99A22': (8, 38, 96, 2), '#173F52': (92, 60, 40, 40),
}

TYPE = {  # the type scale (pt): display Fredoka, text Poppins; leading in brackets
    'cover': (54, 'Fredoka-Bold'), 'opener': (40, 'Fredoka-Bold'), 'title': (24, 'Fredoka'), 'h1': (20, 'Fredoka'), 'h2': (14.5, 'Fredoka'),
    'h3': (12, 'Poppins-SemiBold'), 'body': (10.2, 'Poppins'), 'small': (8.6, 'Poppins'), 'label': (7.4, 'Poppins-SemiBold'),
}

# cast roles (data: generators read these; a new unit only changes the records, not this table)
ROLE = {
    'teacher':  {'slug': 'ms-june', 'name': 'Ms. June', 'role': 'story-world teacher'},
    'routines': {'slug': 'principal-hazel', 'name': 'Principal Hazel', 'role': 'story-world principal'},
    'setup':    {'slug': 'mr-moss', 'name': 'Mr. Moss', 'role': 'story-world classroom helper'},
    'art':      {'slug': 'ms-fern', 'name': 'Ms. Fern', 'role': 'story-world art teacher'},
}
PARENT = {'booker': 'bruno', 'lumi': 'rose', 'zuri': 'sage', 'bop': 'ella'}
CLASSMATES = ['tilly', 'nico', 'pip', 'finn', 'mimi', 'poppy', 'tad']
POSE = {  # the pose each friend takes in a role on the page
    'booker': {'opener': 'booker-hero', 'read': 'booker-reading', 'think': 'booker-thinking', 'wave': 'booker-waving', 'stand': 'booker'},
    'lumi': {'opener': 'lumi-waving', 'calm': 'lumi-calm-breath', 'kind': 'lumi-heart-hands', 'hop': 'lumi-hop', 'stand': 'lumi'},
    'zuri': {'opener': 'zuri-pointing', 'look': 'zuri-magnifier', 'eat': 'zuri-apple', 'peek': 'zuri-peek', 'stand': 'zuri'},
    'bop': {'opener': 'bop-waving', 'dance': 'bop-dancing', 'run': 'bop-running', 'walk': 'bop-walk-in', 'stand': 'bop'},
}
BLOCK_ICON = {'circle': 'circle', 'picture-talk': 'picture-talk', 'friends-live': 'friends-live', 'activity': 'activity', 'outside': 'outside',
              'move': 'move', 'zones': 'zones', 'story': 'story', 'meal': 'meal', 'family': 'home', 'goodbye': 'goodbye'}

_MAN = None
def manifest():
    global _MAN
    if _MAN is None:
        _MAN = {f['slug']: f for f in json.load(open(os.path.join(ROOT, 'img/plush/manifest.json')))['files']
                if f['path'].endswith('-960.webp') and f['kind'] in ('character', 'pose', 'hero-pose')}
    return _MAN


def scale(slug):
    return manifest()[slug].get('lineup_scale') or 0.6


def name_of(slug):
    return manifest()[slug]['name']


def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(h):
    c = [x / 255 for x in hexrgb(h)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


# ---------------------------------------------------------------- icons: one drawn set (24-unit grid, y down) for print and web
def _heart(cx, cy, s):
    return [('M', cx, cy + .85 * s), ('C', cx - .2 * s, cy + .6 * s, cx - s, cy + .15 * s, cx - s, cy - .35 * s),
            ('C', cx - s, cy - .85 * s, cx - .35 * s, cy - 1.05 * s, cx, cy - .55 * s),
            ('C', cx + .35 * s, cy - 1.05 * s, cx + s, cy - .85 * s, cx + s, cy - .35 * s),
            ('C', cx + s, cy + .15 * s, cx + .2 * s, cy + .6 * s, cx, cy + .85 * s), ('Z',)]


def _star(cx, cy, r, inner=.45):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


def _ring(cx, cy, r, n, dot, start=-90):
    return [('C', cx + r * math.cos(math.radians(start + i * 360 / n)), cy + r * math.sin(math.radians(start + i * 360 / n)), dot) for i in range(n)]


# ops: ('c',cx,cy,r) circle  ('C',cx,cy,r) filled circle  ('e',cx,cy,rx,ry) ellipse  ('l',x1,y1,x2,y2) line
#      ('p',[pts],closed) polyline  ('P',[pts]) filled polygon  ('r',x,y,w,h,rad) rounded rect  ('b',x0,y0,x1,y1,x2,y2,x3,y3) curve
#      ('path',[('M',x,y),('C',...),('L',x,y),('Z',)],filled)
ICONS = {
    'circle': [('c', 12, 12, 4.6)] + _ring(12, 12, 9, 7, 1.7),
    'picture-talk': [('r', 3, 3.5, 18, 13, 3.2), ('p', [(8, 16.5), (7.2, 20.8), (12.2, 16.5)], False), ('C', 8.4, 8.2, 1.6),
                     ('p', [(6, 13.6), (10, 9.8), (12.8, 12.2), (15, 10.2), (18, 13.6)], False)],
    'friends-live': [('r', 3, 5, 18, 15, 2.4), ('l', 3, 9, 21, 9), ('b', 3, 9, 5.5, 11.5, 7, 11.5, 8, 9), ('b', 21, 9, 18.5, 11.5, 17, 11.5, 16, 9),
                     ('P', _star(12, 14.4, 3.6))],
    'activity': [('r', 3.5, 12.5, 7.5, 7.5, 1.6), ('r', 13, 12.5, 7.5, 7.5, 1.6), ('r', 8.2, 3.5, 7.5, 7.5, 1.6)],
    'outside': [('c', 12, 9.2, 5.6), ('l', 12, 14.8, 12, 20.5), ('l', 6, 20.5, 18, 20.5), ('l', 12, 17.2, 14.6, 15)],
    'move': [('c', 16.2, 13.4, 4.4), ('l', 2.8, 9.2, 8.6, 9.2), ('l', 4.6, 13.4, 9.6, 13.4), ('l', 2.8, 17.6, 8.6, 17.6),
             ('b', 13.2, 10.2, 15.4, 12, 17, 12.4, 20.4, 11.6)],
    'zones': [('r', 3.5, 3.5, 7.5, 7.5, 2), ('r', 13, 3.5, 7.5, 7.5, 2), ('r', 3.5, 13, 7.5, 7.5, 2), ('C', 16.75, 16.75, 3.4)],
    'story': [('b', 12, 7, 9.5, 5, 5.5, 4.8, 3, 5.8), ('l', 3, 5.8, 3, 18.4), ('b', 3, 18.4, 5.5, 17.4, 9.5, 17.6, 12, 19.4),
              ('b', 12, 7, 14.5, 5, 18.5, 4.8, 21, 5.8), ('l', 21, 5.8, 21, 18.4), ('b', 21, 18.4, 18.5, 17.4, 14.5, 17.6, 12, 19.4), ('l', 12, 7, 12, 19.4)],
    'meal': [('l', 3, 12, 21, 12), ('b', 4, 12, 4.4, 17.4, 8, 20, 12, 20), ('b', 20, 12, 19.6, 17.4, 16, 20, 12, 20),
             ('b', 10, 9, 8.8, 7.4, 11, 6, 9.8, 3.8), ('b', 14.4, 9, 13.2, 7.4, 15.4, 6, 14.2, 3.8)],
    'home': [('p', [(3.5, 11.2), (12, 3.8), (20.5, 11.2)], False), ('p', [(6, 9.4), (6, 20.2), (18, 20.2), (18, 9.4)], False),
             ('path', _heart(12, 14.6, 3.1), True)],
    'goodbye': [('p', [(5, 9.2), (19, 9.2), (17.8, 20.4), (6.2, 20.4)], True), ('b', 8.8, 9.2, 8.8, 3.4, 15.2, 3.4, 15.2, 9.2),
                ('path', _heart(12, 14.9, 2.7), True)],
    'supplies': [('p', [(3, 10), (21, 10), (18.6, 20.4), (5.4, 20.4)], True), ('b', 7.2, 10, 7.2, 2.8, 16.8, 2.8, 16.8, 10),
                 ('l', 9, 13.2, 9.5, 17.6), ('l', 12, 13.2, 12, 17.6), ('l', 15, 13.2, 14.5, 17.6)],
    'print': [('p', [(6, 3), (14, 3), (18.4, 7.4), (18.4, 21), (6, 21)], True), ('p', [(14, 3), (14, 7.4), (18.4, 7.4)], False),
              ('l', 9, 12, 15.4, 12), ('l', 9, 15, 15.4, 15), ('l', 9, 18, 13, 18)],
    'routine': [('c', 12, 12, 8.6), ('p', [(12, 7), (12, 12), (15.6, 14.2)], False)],
    'safety': [('path', _heart(12, 12.6, 9), False), ('p', [(8.4, 12.2), (11, 14.8), (15.8, 10)], False)],
    'observe': [('c', 10.4, 10.4, 6.2), ('l', 15, 15, 20.6, 20.6)],
    'song': [('C', 7.6, 17.4, 2.7), ('C', 16.4, 15.4, 2.7), ('l', 10.3, 17.4, 10.3, 5.2), ('l', 19.1, 15.4, 19.1, 3.4), ('l', 10.3, 5.2, 19.1, 3.4)],
    'kitchen': [('l', 7.6, 3, 7.6, 21), ('l', 5, 3, 5, 7.8), ('l', 10.2, 3, 10.2, 7.8), ('b', 5, 7.8, 5, 10.8, 10.2, 10.8, 10.2, 7.8),
                ('e', 16.4, 7, 2.9, 4), ('l', 16.4, 11, 16.4, 21)],
    'art': [('path', [('M', 12, 3.2), ('C', 6.4, 3.2, 3, 7.4, 3, 12), ('C', 3, 17, 6.8, 20.8, 11.4, 20.8), ('C', 13.4, 20.8, 13.8, 19.4, 13, 18),
                      ('C', 12.2, 16.6, 13, 15, 14.8, 15), ('L', 17, 15), ('C', 19.6, 15, 21, 13.4, 21, 11.4), ('C', 21, 6.8, 17, 3.2, 12, 3.2), ('Z',)], False),
            ('C', 8, 11, 1.5), ('C', 10.4, 7.2, 1.5), ('C', 15, 7.4, 1.5), ('C', 17.6, 10.8, 1.5)],
    'timing': [('c', 12, 13.4, 7.6), ('l', 12, 13.4, 12, 9.4), ('l', 9.6, 3, 14.4, 3), ('l', 12, 3, 12, 5.8), ('l', 18, 6.4, 19.4, 5)],
    'join': [('c', 6.8, 9.6, 2.5), ('c', 17.2, 9.6, 2.5), ('c', 12, 7.4, 2.8), ('b', 2.4, 18.6, 2.8, 14, 10.6, 14, 11, 18.6),
             ('b', 13, 18.6, 13.4, 14, 21.2, 14, 21.6, 18.6), ('b', 7.2, 16.2, 7.6, 11.6, 16.4, 11.6, 16.8, 16.2)],
    'watch': [('b', 2, 12, 6, 5, 18, 5, 22, 12), ('b', 2, 12, 6, 19, 18, 19, 22, 12), ('c', 12, 12, 3.2)],
    'talk': [('r', 3, 4, 18, 12.4, 4), ('p', [(8, 16.4), (7, 20.6), (12.4, 16.4)], False), ('C', 8, 10.2, 1.25), ('C', 12, 10.2, 1.25), ('C', 16, 10.2, 1.25)],
    'star': [('P', _star(12, 12.6, 9.4))],
    'check': [('p', [(5, 12.6), (10, 17.4), (19.4, 7.2)], False)],
    'cut': [('c', 6, 17.4, 2.6), ('c', 6, 6.6, 2.6), ('l', 8.2, 8.2, 20.4, 16.8), ('l', 8.2, 15.8, 20.4, 7.2)],
    'cast': [('c', 8, 8, 3), ('c', 16.6, 9.4, 2.4), ('b', 2.6, 20, 3, 14.2, 13, 14.2, 13.4, 20), ('b', 12.8, 15.4, 14, 13, 20.6, 13, 21.4, 19)],
    'heart': [('path', _heart(12, 12.6, 8.4), True)],
}
LOOP_ICON = {'Watch': 'watch', 'Talk': 'talk', 'Do': 'activity', 'Move': 'move', 'Explore': 'observe', 'Take home': 'home'}


def draw_icon(c, name, x, y, size, color, lw=1.9):
    """draws ICONS[name] with its 24-unit box at (x, y) bottom-left, size points wide"""
    k = size / 24.0
    X = lambda u: x + u * k
    Y = lambda v: y + (24 - v) * k
    c.saveState()
    c.setStrokeColor(color); c.setFillColor(color); c.setLineWidth(lw * k); c.setLineCap(1); c.setLineJoin(1)
    for op in ICONS[name]:
        t = op[0]
        if t in ('c', 'C'):
            c.circle(X(op[1]), Y(op[2]), op[3] * k, stroke=1 if t == 'c' else 0, fill=1 if t == 'C' else 0)
        elif t == 'e':
            c.ellipse(X(op[1] - op[3]), Y(op[2] - op[4]), X(op[1] + op[3]), Y(op[2] + op[4]), stroke=1, fill=0)
        elif t == 'l':
            c.line(X(op[1]), Y(op[2]), X(op[3]), Y(op[4]))
        elif t in ('p', 'P'):
            pts = op[1]
            p = c.beginPath(); p.moveTo(X(pts[0][0]), Y(pts[0][1]))
            for px, py in pts[1:]:
                p.lineTo(X(px), Y(py))
            if t == 'P' or op[2]:
                p.close()
            c.drawPath(p, stroke=1 if t == 'p' else 0, fill=1 if t == 'P' else 0)
        elif t == 'r':
            c.roundRect(X(op[1]), Y(op[2] + op[4]), op[3] * k, op[4] * k, op[5] * k, stroke=1, fill=0)
        elif t == 'b':
            p = c.beginPath(); p.moveTo(X(op[1]), Y(op[2])); p.curveTo(X(op[3]), Y(op[4]), X(op[5]), Y(op[6]), X(op[7]), Y(op[8]))
            c.drawPath(p, stroke=1, fill=0)
        elif t == 'path':
            p = c.beginPath()
            for s in op[1]:
                if s[0] == 'M':
                    p.moveTo(X(s[1]), Y(s[2]))
                elif s[0] == 'L':
                    p.lineTo(X(s[1]), Y(s[2]))
                elif s[0] == 'C':
                    p.curveTo(X(s[1]), Y(s[2]), X(s[3]), Y(s[4]), X(s[5]), Y(s[6]))
                else:
                    p.close()
            c.drawPath(p, stroke=0 if op[2] else 1, fill=1 if op[2] else 0)
    c.restoreState()


def icons_svg():
    f = lambda v: ('%.2f' % v).rstrip('0').rstrip('.')
    out = ['<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
           '<!-- Futures Friends curriculum icons. GENERATED by tools/ff_brand.py --icons from the same set the PDFs draw; do not edit. -->']
    for name, ops in ICONS.items():
        els = []
        for op in ops:
            t = op[0]
            if t == 'c':
                els.append(f'<circle cx="{f(op[1])}" cy="{f(op[2])}" r="{f(op[3])}"/>')
            elif t == 'C':
                els.append(f'<circle cx="{f(op[1])}" cy="{f(op[2])}" r="{f(op[3])}" fill="currentColor" stroke="none"/>')
            elif t == 'e':
                els.append(f'<ellipse cx="{f(op[1])}" cy="{f(op[2])}" rx="{f(op[3])}" ry="{f(op[4])}"/>')
            elif t == 'l':
                els.append(f'<path d="M{f(op[1])} {f(op[2])}L{f(op[3])} {f(op[4])}"/>')
            elif t in ('p', 'P'):
                d = 'M' + 'L'.join(f'{f(a)} {f(b)}' for a, b in op[1]) + ('Z' if t == 'P' or op[2] else '')
                els.append(f'<path d="{d}"' + (' fill="currentColor" stroke="none"/>' if t == 'P' else '/>'))
            elif t == 'r':
                els.append(f'<rect x="{f(op[1])}" y="{f(op[2])}" width="{f(op[3])}" height="{f(op[4])}" rx="{f(op[5])}"/>')
            elif t == 'b':
                els.append(f'<path d="M{f(op[1])} {f(op[2])}C{f(op[3])} {f(op[4])} {f(op[5])} {f(op[6])} {f(op[7])} {f(op[8])}"/>')
            elif t == 'path':
                d = ''.join(s[0] + ' '.join(f(v) for v in s[1:]) for s in op[1])
                els.append(f'<path d="{d}"' + (' fill="currentColor" stroke="none"/>' if op[2] else '/>'))
        out.append(f'<symbol id="i-{name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{"".join(els)}</symbol>')
    out.append('</svg>')
    return '\n'.join(out) + '\n'


# ---------------------------------------------------------------- raster assets (cached; every PDF also gets its images recompressed)
_CACHE = {}


def _reader(im, fmt='PNG', q=86):
    from reportlab.lib.utils import ImageReader
    b = io.BytesIO()
    if fmt == 'JPEG':
        im.convert('RGB').save(b, 'JPEG', quality=q, optimize=True)
    else:
        im.save(b, 'PNG')
    b.seek(0)
    return ImageReader(b)


def char(slug, h_pt=None):
    """a plush character cut-out: (ImageReader, (w, h)), about 240 dpi at the printed height, in steps (480/600/720/960 px) so the
    same character at similar sizes is embedded once per PDF"""
    need = 480 if h_pt is None else h_pt / 72 * 240
    px = next((t for t in (480, 600, 720, 960) if t >= need), 960)
    key = ('char', slug, px)
    if key not in _CACHE:
        im = Image.open(os.path.join(ROOT, 'img/plush/characters', f'{slug}-{480 if px == 480 else 960}.webp')).convert('RGBA')
        if px not in (480, 960):
            im = im.resize((round(im.width * px / 960), px), Image.LANCZOS)
        _CACHE[key] = (_reader(im), im.size)
    return _CACHE[key]


def prop(slug, tier=480):
    key = ('prop', slug, tier)
    if key not in _CACHE:
        im = Image.open(os.path.join(ROOT, 'img/plush/props', f'{slug}-{tier}.webp')).convert('RGBA')
        _CACHE[key] = (_reader(im), im.size)
    return _CACHE[key]


def logo(kind='plush'):
    """the program logo. Owner rule (2026-10-07): every Futures Friends logo is the plush wordmark (img/brand/ff-plush-wordmark-640.png);
    'mark' is the square plush FF mark (img/brand/ff-plush-mark-512.png) where a square fits. The FLC shield is the school logo only
    and never appears here. Older kinds ('sticker', 'navy') map to the wordmark."""
    path = 'img/brand/ff-plush-mark-512.png' if kind == 'mark' else 'img/brand/ff-plush-wordmark-640.png'
    key = ('logo', path)
    if key not in _CACHE:
        im = Image.open(os.path.join(ROOT, path)).convert('RGBA')
        _CACHE[key] = (_reader(im), im.size)
    return _CACHE[key]


def _felt_array():
    import numpy as np
    if 'felt-src' not in _CACHE:
        a = np.asarray(Image.open(os.path.join(ROOT, 'img/plush/textures/felt-cream-1024.webp')).convert('L'), dtype=float)
        _CACHE['felt-src'] = (a - a.mean()) / (a.std() + 1e-6)
    return _CACHE['felt-src']


def felt_tile(tone, grain=9.0, px=512):
    """one seamless felt tile in any colour (the plush felt-cream grain over the tone); panels are tiled from it, so each colour is
    embedded once per PDF however many panels use it"""
    import numpy as np
    key = ('felt', tone, grain, px)
    if key not in _CACHE:
        d = _felt_array()
        d = np.asarray(Image.fromarray(((d - d.min()) / (d.max() - d.min()) * 255).astype('uint8')).resize((px, px), Image.LANCZOS), dtype=float)
        d = (d - d.mean()) / (d.std() + 1e-6)
        base = np.array(hexrgb(tone), dtype=float)
        out = np.clip(base[None, None, :] + grain * d[:, :, None], 0, 255).astype('uint8')
        _CACHE[key] = (_reader(Image.fromarray(out, 'RGB'), 'JPEG', 80), (px, px))
    return _CACHE[key]


TILE_PT = 512 / 150 * 72          # a felt tile prints at 150 dpi (true texture scale)


def grass_tile():
    if 'grass' not in _CACHE:
        src = Image.open(os.path.join(ROOT, 'img/plush/textures/meadow-grass-512.webp')).convert('RGB').resize((256, 256), Image.LANCZOS)
        _CACHE['grass'] = (_reader(src, 'JPEG', 82), (256, 256))
    return _CACHE['grass']


# ---------------------------------------------------------------- canvas primitives
def H(x):
    from reportlab.lib.colors import HexColor
    return HexColor(x)


def round_clip(c, x, y, w, h, r):
    p = c.beginPath(); p.roundRect(x, y, w, h, r) if r else p.rect(x, y, w, h)
    c.clipPath(p, stroke=0, fill=0)


def felt(c, x, y, w, h, tone, r=0, stitch=True, thread=None, inset=7, dpi=150, grain=9.0, lw=1.1):
    """a felt panel: textured fill, then a stitched thread line inset from its edge"""
    reader, _ = felt_tile(tone, grain)
    c.saveState(); round_clip(c, x, y, w, h, r)
    ty = y
    while ty < y + h:
        tx = x
        while tx < x + w:
            c.drawImage(reader, tx, ty, width=TILE_PT, height=TILE_PT); tx += TILE_PT
        ty += TILE_PT
    c.restoreState()
    if stitch:
        stitch_rect(c, x + inset, y + inset, w - 2 * inset, h - 2 * inset, max(0, r - inset * 0.6), thread or '#FFFFFF', lw)


def stitch_rect(c, x, y, w, h, r, color, lw=1.1, dash=(3.4, 2.6), alpha=0.85):
    c.saveState(); c.setStrokeColor(H(color)); c.setStrokeAlpha(alpha); c.setLineWidth(lw); c.setDash(*dash); c.setLineCap(1)
    c.roundRect(x, y, w, h, r, stroke=1, fill=0) if r else c.rect(x, y, w, h, stroke=1, fill=0)
    c.restoreState()


def stitch_line(c, x1, y1, x2, y2, color, lw=1.1, dash=(3.4, 2.6), alpha=1):
    c.saveState(); c.setStrokeColor(H(color)); c.setStrokeAlpha(alpha); c.setLineWidth(lw); c.setDash(*dash); c.setLineCap(1)
    c.line(x1, y1, x2, y2); c.restoreState()


def ground(c, x, y, w, h=9):
    """the felt-grass strip every character stands on"""
    reader, _ = grass_tile()
    t = 256 / 200 * 72
    c.saveState(); round_clip(c, x, y, w, h, h / 2)
    tx = x
    while tx < x + w:
        c.drawImage(reader, tx, y + h / 2 - t / 2, width=t, height=t); tx += t
    c.restoreState()


def stand(c, slug, cx, base, h):
    """draw a character with its feet on `base` (the image keeps 1.5% bottom padding), centred on cx; returns width"""
    reader, (iw, ih) = char(slug, h)
    w = h * iw / ih
    c.drawImage(reader, cx - w / 2, base - h * 0.012, width=w, height=h, mask='auto')
    return w


def cast_row(c, slugs, cx, base, unit, gap=-6, grass=True, grass_pad=14, max_w=None):
    """characters on one ground line, each at unit x lineup_scale (one height unit for children and grown-ups); returns (x0, x1).
    max_w shrinks the shared unit (never one character alone) until the row fits"""
    if max_w:
        span = lambda u: sum(u * scale(s) * char(s, u * scale(s))[1][0] / char(s, u * scale(s))[1][1] for s in slugs) + gap * (len(slugs) - 1)
        while span(unit) > max_w and unit > 20:
            unit *= 0.97
    sizes = []
    for s in slugs:
        _, (iw, ih) = char(s, unit * scale(s))
        h = unit * scale(s); sizes.append((s, h, h * iw / ih))
    total = sum(w for _, _, w in sizes) + gap * (len(sizes) - 1)
    x = cx - total / 2
    if grass:
        ground(c, x - grass_pad, base - 4, total + 2 * grass_pad, 10)
    for s, h, w in sizes:
        stand(c, s, x + w / 2, base, h); x += w + gap
    return cx - total / 2, cx + total / 2


def pill(c, text, x, y, size=7.4, fg='#FFFFFF', bg=NAVY, font='Poppins-SemiBold', pad=5, align='left', alpha=1):
    from reportlab.pdfbase.pdfmetrics import stringWidth
    w = stringWidth(text, font, size) + 2 * pad
    if align == 'right':
        x -= w
    elif align == 'center':
        x -= w / 2
    c.saveState(); c.setFillColor(H(bg)); c.setFillAlpha(alpha); c.roundRect(x, y, w, size + 2 * pad * .7, (size + 2 * pad * .7) / 2, stroke=0, fill=1); c.restoreState()
    c.setFillColor(H(fg)); c.setFont(font, size); c.drawString(x + pad, y + pad * .7 + size * .18, text)
    return w


def story_label(c, x, y, who='Story-world character', align='left', size=6.6, dark=False):
    return pill(c, who, x, y, size, '#FFFFFF' if dark else NAVY, NAVY if dark else '#F3EBDA', 'Poppins-SemiBold', 4, align)


def badge(c, icon_name, cx, cy, r, tone, fg='#FFFFFF', ring=True):
    """an icon on a felt-coloured disc with a stitched ring"""
    c.saveState(); c.setFillColor(H(tone)); c.circle(cx, cy, r, stroke=0, fill=1); c.restoreState()
    if ring and r > 7:
        c.saveState(); c.setStrokeColor(H('#FFFFFF')); c.setStrokeAlpha(.75); c.setLineWidth(max(.5, r * .045)); c.setDash(r * .17, r * .13)
        c.circle(cx, cy, r * .82, stroke=1, fill=0); c.restoreState()
    s = r * 1.12
    draw_icon(c, icon_name, cx - s / 2, cy - s / 2, s, H(fg), lw=2.1)


AVATAR_CROP = {'ms-june': 0.36, 'principal-hazel': 0.3, 'mr-moss': 0.42, 'ms-fern': 0.44, 'bruno': 0.36, 'rose': 0.32, 'sage': 0.36, 'ella': 0.36,
               'mara': 0.36, 'rowan': 0.4}


def popout(c, slug, cx, cy, r, tone, crop=None):
    """avatar badge: a felt disc with the character's head and shoulders standing out of its top edge (the cut-out itself,
    never a circle mask around the face)"""
    crop = crop or AVATAR_CROP.get(slug, 0.5)
    felt(c, cx - r, cy - r, 2 * r, 2 * r, tone, r=r, stitch=False, dpi=170)
    stitch_rect(c, cx - r + 2.6, cy - r + 2.6, 2 * r - 5.2, 2 * r - 5.2, r - 2.6, '#FFFFFF', .7)
    h = 2.25 * r / crop
    reader, (iw, ih) = char(slug, h)
    w = h * iw / ih
    c.saveState()
    p = c.beginPath()          # one outline (no overlapping sub-paths): the disc's lower half, open to the sky above its centre
    p.moveTo(cx - 2 * r, cy); p.lineTo(cx - r, cy); p.arcTo(cx - r, cy - r, cx + r, cy + r, 180, 180)
    p.lineTo(cx + 2 * r, cy); p.lineTo(cx + 2 * r, cy + 3 * r); p.lineTo(cx - 2 * r, cy + 3 * r); p.close()
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(reader, cx - w / 2, cy + 1.25 * r - h, width=w, height=h, mask='auto')
    c.restoreState()


def thumb_tab(c, W, Hh, week, tone, label=None, n_weeks=4, top=1.32 * 72, step=1.42 * 72, tab_h=1.22 * 72, tab_w=0.36 * 72):
    """the binder thumb index on the outer edge: its height on the page also encodes the week"""
    y = Hh - top - (week - 1) * step - tab_h
    felt(c, W - tab_w, y, tab_w + 8, tab_h, tone, r=8, stitch=False, dpi=150)
    stitch_line(c, W - tab_w + 5, y + 7, W - tab_w + 5, y + tab_h - 7, '#FFFFFF', .8, alpha=.8)
    c.saveState(); c.translate(W - tab_w / 2 + 3.2, y + tab_h / 2); c.rotate(90)
    c.setFillColor(H('#FFFFFF')); c.setFont('Fredoka', 9.6); c.drawCentredString(0, 0, label or f'Week {week}')
    c.restoreState()


def segs(c, parts, x, y, size=8, font='Poppins', color=MUTED, dot=GOLD, max_w=None):
    """a line of labels separated by small drawn dots (not a middle-dot string); shrinks to max_w"""
    from reportlab.pdfbase.pdfmetrics import stringWidth
    gap = size * 1.25
    while max_w and size > 6 and sum(stringWidth(p, font, size) for p in parts) + gap * (len(parts) - 1) > max_w:
        size -= 0.25; gap = size * 1.25
    c.setFont(font, size)
    for i, p in enumerate(parts):
        c.setFillColor(H(color)); c.drawString(x, y, p); x += stringWidth(p, font, size)
        if i < len(parts) - 1:
            c.setFillColor(H(dot)); c.circle(x + gap / 2, y + size * .34, size * .13, stroke=0, fill=1); x += gap
    return x


def fit_size(text, font, size, max_w, floor=10):
    from reportlab.pdfbase.pdfmetrics import stringWidth
    while stringWidth(text, font, size) > max_w and size > floor:
        size -= 0.5
    return size


def draft_pill(c, x, y, align='right', on_felt=False):
    return pill(c, 'DRAFT · not reviewed', x, y, 7.6, NAVY, GOLD if on_felt else '#F6E2AE', 'Poppins-SemiBold', 6, align)


# ---------------------------------------------------------------- page frame (interior pages: plain paper, quiet header)
def page_header(c, W, Hh, title, sub_parts, friend='navy', week=None, draft=True, logo_kind='sticker'):
    F = FRIEND[friend]
    reader, (iw, ih) = logo(logo_kind)
    lh = 0.46 * 72
    c.drawImage(reader, 0.55 * 72, Hh - 0.78 * 72, width=lh * iw / ih, height=lh, mask='auto')
    tx = 0.55 * 72 + lh * iw / ih + 12
    right = W - 0.62 * 72 - (118 if draft else 0)
    size = fit_size(title, 'Fredoka', 17, right - tx, 11)
    c.setFillColor(H(NAVY)); c.setFont('Fredoka', size); c.drawString(tx, Hh - 0.53 * 72, title)
    if sub_parts:
        segs(c, sub_parts, tx, Hh - 0.71 * 72, 7.8, 'Poppins', MUTED, F['felt'], max_w=W - 0.62 * 72 - tx - (40 if week else 0))
    if draft:
        draft_pill(c, W - 0.62 * 72, Hh - 0.6 * 72)
    stitch_line(c, 0.55 * 72, Hh - 0.92 * 72, W - 0.62 * 72, Hh - 0.92 * 72, F['felt'], 1.2)
    if week:
        thumb_tab(c, W, Hh, week, F['felt'], f'Week {week}')


def page_footer(c, W, text, page=None, size=7.2):
    stitch_line(c, 0.55 * 72, 0.6 * 72, W - 0.62 * 72, 0.6 * 72, '#CDBFA4', .7, (2.4, 2.2))
    c.setFillColor(H(MUTED)); c.setFont('Poppins', size)
    from reportlab.pdfbase.pdfmetrics import stringWidth
    room = W - 1.17 * 72 - (50 if page is not None else 0)
    s = size
    while stringWidth(text, 'Poppins', s) > room and s > 5.6:
        s -= 0.2
    c.setFont('Poppins', s); c.drawString(0.55 * 72, 0.4 * 72, text)
    if page is not None:
        c.setFont('Poppins-SemiBold', size); c.drawRightString(W - 0.62 * 72, 0.4 * 72, f'Page {page}')


def opener_band(c, W, Hh, band_h, friend, kicker_parts, big, title, cast=None, cast_h=None, logo_h=0.66 * 72, draft=True,
                week=None, icon=None, tone=None, title_max=None):
    """the story-world band at the top of a day, a story set or a section: felt in the lead friend's colour, the plush logo,
    the big line, and the cast standing on felt grass across the band's lower edge (they overlap the paper: the pop-up move)"""
    F = FRIEND[friend]
    tone = tone or F['felt']
    y0 = Hh - band_h
    felt(c, -8, y0, W + 16, band_h + 8, tone, r=0, stitch=False)
    stitch_line(c, 0, y0 + 9, W, y0 + 9, F['thread'], 1.1, alpha=.9)
    reader, (iw, ih) = logo('plush')
    c.drawImage(reader, 0.5 * 72, Hh - 0.22 * 72 - logo_h, width=logo_h * iw / ih, height=logo_h, mask='auto')
    if draft:                                  # beside the logo, always the same place on every opener
        draft_pill(c, 0.5 * 72 + logo_h * iw / ih + 10, Hh - 0.22 * 72 - logo_h / 2 - 7, align='left', on_felt=True)
    cast_w = 0
    if cast:
        unit = cast_h or band_h * 1.25
        cast_w = sum(unit * scale(s) * char(s, unit * scale(s))[1][0] / char(s, unit * scale(s))[1][1] for s in cast) - 4 * (len(cast) - 1) + 0.3 * 72
    tx = 0.55 * 72
    tmax = title_max or (W - tx - cast_w - 0.5 * 72)
    yk = Hh - 0.22 * 72 - logo_h - 15
    if kicker_parts:
        segs(c, kicker_parts, tx, yk, 8.6, 'Poppins-SemiBold', '#FFFFFF', F['thread'], max_w=tmax)
    yb = yk - 8
    if big:
        bs = fit_size(big, 'Fredoka-Bold', 44 if band_h > 2.2 * 72 else 30, tmax, 14)
        if icon:
            badge(c, icon, tx + bs * .42, yb - bs * .5, bs * .46, F['deep'])
            bx = tx + bs * .98
        else:
            bx = tx
        c.setFillColor(H('#FFFFFF')); c.setFont('Fredoka-Bold', bs); c.drawString(bx, yb - bs * .82, big)
        yb -= bs * 1.0
    if title:
        ts = fit_size(title, 'Fredoka', 24 if band_h > 2.2 * 72 else 19, tmax, 12)
        c.setFillColor(H('#FFFFFF')); c.setFont('Fredoka', ts); c.drawString(tx, yb - ts * .95, title)
    if cast:
        cast_row(c, cast, W - 0.3 * 72 - cast_w / 2, y0 - 2, unit, gap=-4, grass_pad=12)
    if week:
        thumb_tab(c, W, Hh, week, F['felt'], f'Week {week}', top=band_h + 0.5 * 72, step=1.32 * 72)


def compress(path, quality=82):
    """make a finished PDF small without MuPDF's image rewriter (it segfaults on these files: never call rewrite_images).
    Each large RGB image stream (reportlab embeds them as Flate) is decoded once and replaced in place by a JPEG stream; its soft
    mask (alpha) stays a separate lossless object, so cut-outs keep their edges. Only object streams change, never page content."""
    import fitz
    d = fitz.open(path)
    for x in range(1, d.xref_length()):
        try:
            if d.xref_get_key(x, 'Subtype')[1] != '/Image' or d.xref_get_key(x, 'Filter')[1] in ('/DCTDecode', 'null'):
                continue
            if d.xref_get_key(x, 'ColorSpace')[1] != '/DeviceRGB' or d.xref_get_key(x, 'BitsPerComponent')[1] != '8':
                continue
            w, h = int(d.xref_get_key(x, 'Width')[1]), int(d.xref_get_key(x, 'Height')[1])
            if w * h < 30000:
                continue
            raw = d.xref_stream(x)                      # decoded samples
            if len(raw) != w * h * 3:
                continue
            b = io.BytesIO(); Image.frombytes('RGB', (w, h), raw).save(b, 'JPEG', quality=quality, optimize=True)
            d.update_stream(x, b.getvalue(), compress=0)
            d.xref_set_key(x, 'Filter', '/DCTDecode'); d.xref_set_key(x, 'DecodeParms', 'null')
        except Exception:
            continue
    tmp = path + '.c.tmp'
    d.save(tmp, garbage=4, deflate=True, no_new_id=True, pretty=True); d.close(); os.replace(tmp, path)


def set_lang(path, lang='en-US'):
    import fitz
    d = fitz.open(path)
    d.xref_set_key(d.pdf_catalog(), 'Lang', f'({lang})')
    d.xref_set_key(d.pdf_catalog(), 'ViewerPreferences', '<</DisplayDocTitle true>>')
    tmp = path + '.l.tmp'
    d.save(tmp, garbage=3, deflate=True, no_new_id=True, pretty=True); d.close(); os.replace(tmp, path)


def finish(path, lang='en-US'):
    compress(path); set_lang(path, lang)


def register_fonts(make_ttf):
    """make_ttf(src, dst, wght) -> path (make-printables.py fonts()); adds the 700 display weight"""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont as RLFont
    if 'Fredoka-Bold' not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(RLFont('Fredoka-Bold', make_ttf('fredoka-latin.woff2', 'Fredoka-700.ttf', 700)))


def main():
    if '--icons' in sys.argv:
        d = os.path.join(ROOT, 'img', 'curriculum'); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'icons.svg'), 'w').write(icons_svg())
        print('img/curriculum/icons.svg:', len(ICONS), 'icons')
    if '--swatches' in sys.argv:
        for k, v in FRIEND.items():
            print(f'{k:7} deep {v["deep"]} on paper {contrast(v["deep"], PAPER):.2f}:1, on tint {contrast(v["deep"], v["tint"]):.2f}:1; '
                  f'white on felt {contrast("#FFFFFF", v["felt"]):.2f}:1; CMYK felt {CMYK.get(v["felt"])}')
        print('muted on paper', round(contrast(MUTED, PAPER), 2), 'navy on paper', round(contrast(NAVY, PAPER), 2))


if __name__ == '__main__':
    main()
