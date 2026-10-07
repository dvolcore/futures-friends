#!/usr/bin/env python3
"""Builds the Unit 1 curriculum packaging for the center welcome box (wave 10, 2026-10-07): print-ready PDF + PNG mockups.

    python3 tools/make-curriculum-package.py [--src /Volumes/FFCRM/app/hub/content/program]

Writes $FF_CURRICULUM_PRIVATE/files/printables/unit-1/package/ in the PRIVATE platform repo (IP lockdown 2026-10-07; tools/private_paths.py):
  u1-binder-print.pdf   press-ready sheets with 0.125 in bleed and crop marks:
                          1 front cover insert (8.5 x 11 in trim, fits a 1.5 to 2 in clear-view binder)
                          2 back cover insert: the cast in their recurring roles + the page-system key (icons, colours)
                          3 spine inserts, 1.5 in and 2 in (one sheet)
                          4-11 eight tab dividers (9 x 11 in trim, tab extension staggered top to bottom: Start here, Week 1-4,
                               Classroom printables, Story sets, Families)
  previews/u1-binder-mockup.png    the binder, standing, with the tab dividers showing
  previews/u1-binder-flatlay.png   cover, spine, back and the eight tabs laid flat
Vector colour is CMYK (the builds in tools/ff_brand.py CMYK, inside SWOP coverage); the plush art and felt are RGB images that the
printer's RIP converts. Words come from the canonical Unit 1 manifest (title, ages, weeks, values), so a new unit only needs records.
Everything is labelled Draft until a reviewer approves Unit 1. No generated art: only the plush library and the plush logo.
"""
import argparse, io, json, os, sys

import fitz
from PIL import Image, ImageDraw, ImageFilter
from reportlab.lib.colors import CMYKColor, HexColor
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import importlib.util
_spec = importlib.util.spec_from_file_location('make_printables', os.path.join(ROOT, 'tools', 'make-printables.py'))
mp = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(mp)
import ff_brand as B

import private_paths as PP   # IP lockdown 2026-10-07: the binder print file goes to the private platform repo
OUT = os.path.join(PP.FILES, 'printables', 'unit-1', 'package')
BLEED, MARK = 0.125 * inch, 0.5 * inch          # bleed, and the slug area that carries the crop marks


def K(hexv):
    """CMYK build for a brand colour (falls back to the RGB value when a colour has no build)"""
    v = B.CMYK.get(hexv)
    return CMYKColor(*(x / 100 for x in v)) if v else HexColor(hexv)


def sheet(c, tw, th):
    """starts a page with trim tw x th: page = trim + bleed + mark area; returns the trim origin"""
    c.setPageSize((tw + 2 * (BLEED + MARK), th + 2 * (BLEED + MARK)))
    return BLEED + MARK, BLEED + MARK


def crop_marks(c, x, y, tw, th, label):
    c.saveState(); c.setStrokeColor(CMYKColor(1, 1, 1, 1)); c.setLineWidth(.25)
    for cx, cy in [(x, y), (x + tw, y), (x, y + th), (x + tw, y + th)]:
        dx = -1 if cx == x else 1; dy = -1 if cy == y else 1
        c.line(cx + dx * (BLEED + 2), cy, cx + dx * (BLEED + MARK - 6), cy)
        c.line(cx, cy + dy * (BLEED + 2), cx, cy + dy * (BLEED + MARK - 6))
    c.setFillColor(CMYKColor(0, 0, 0, 1)); c.setFont('Poppins', 6)
    c.drawString(x, y - BLEED - MARK + 10, f'{label}  ·  trim {tw / inch:g} x {th / inch:g} in  ·  bleed 0.125 in  ·  Futures Friends Unit 1 (draft edition)')
    c.restoreState()


def felt_bleed(c, x, y, w, h, tone):
    B.felt(c, x - BLEED, y - BLEED, w + 2 * BLEED, h + 2 * BLEED, tone, stitch=False)


def img(path, max_px=900):
    im = Image.open(os.path.join(ROOT, path)).convert('RGBA'); im.thumbnail((max_px, max_px), Image.LANCZOS)
    return B._reader(im), im.size


def draw(c, ref, x, y, h=None, w=None, cx=None):
    return mp.draw_img(c, ref, x, y, h=h, w=w, cx=cx)


def cover(c, man):
    tw, th = 8.5 * inch, 11 * inch
    x, y = sheet(c, tw, th)
    navy = B.FRIEND['navy']['felt']
    felt_bleed(c, x, y, tw, th, navy)
    B.stitch_rect(c, x + 0.32 * inch, y + 0.32 * inch, tw - 0.64 * inch, th - 0.64 * inch, 22, B.FRIEND['navy']['thread'], 1.4)
    draw(c, img('img/plush/hero/felt-sun-320.webp'), x + tw - 1.9 * inch, y + th - 1.75 * inch, h=1.25 * inch)
    draw(c, img('img/plush/hero/felt-cloud-2-480.webp'), x + 0.55 * inch, y + th - 1.45 * inch, h=0.62 * inch)
    draw(c, img('img/plush/hero/felt-cloud-4-480.webp'), x + tw - 2.6 * inch, y + th - 2.15 * inch, h=0.5 * inch)
    draw(c, B.logo('plush'), None, y + th - 2.95 * inch, h=1.75 * inch, cx=x + tw / 2)
    c.setFillColor(K(B.GOLD)); c.setFont('Fredoka', 17); c.drawCentredString(x + tw / 2, y + th - 3.45 * inch, 'Curriculum')
    c.setFillColor(CMYKColor(0, 0, 0, 0)); c.setFont('Fredoka-Bold', 76); c.drawCentredString(x + tw / 2, y + th - 4.55 * inch, 'Unit 1')
    t = man['title'].replace('Unit 1: ', '')
    c.setFont('Fredoka', B.fit_size(t, 'Fredoka', 25, tw - 1.4 * inch, 14)); c.drawCentredString(x + tw / 2, y + th - 5.08 * inch, t)
    facts = [man['ages'], man['length'], 'Draft edition, not yet reviewed']
    B.segs(c, facts, x + tw / 2 - (sum(stringWidth(f, 'Poppins-SemiBold', 10) for f in facts) + 25) / 2, y + th - 5.48 * inch, 10, 'Poppins-SemiBold', '#FFFFFF', B.GOLD)
    # the four friends lead the four weeks: one friend per week chip
    for i, w in enumerate(man['weeks']):
        k = w['lead']; F = B.FRIEND[k]; cw = 1.62 * inch; cx0 = x + tw / 2 - 2 * cw - 0.15 * inch + i * (cw + 0.1 * inch)
        B.felt(c, cx0, y + th - 6.25 * inch, cw, 0.5 * inch, F['felt'], r=10, inset=3.5, thread=F['thread'], lw=.8)
        c.setFillColor(CMYKColor(0, 0, 0, 0)); c.setFont('Fredoka', 10.5); c.drawCentredString(cx0 + cw / 2, y + th - 5.97 * inch, f'Week {w["week"]}: {B.FRIEND[k]["name"]}')
        c.setFont('Poppins', 7.6); c.drawCentredString(cx0 + cw / 2, y + th - 6.13 * inch, w['value'])
    # the cast on one ground line (one height unit): grown-ups at the ends, Booker at centre stage
    cast = ['principal-hazel', 'ms-june', 'tilly', 'lumi', 'booker-hero', 'zuri', 'bop', 'nico', 'mr-moss', 'ms-fern']
    B.ground(c, x - BLEED, y + 0.95 * inch, tw + 2 * BLEED, 18)
    B.cast_row(c, cast, x + tw / 2, y + 1.08 * inch, 3.6 * inch, gap=-8, grass=False, max_w=tw - 0.9 * inch)
    B.story_label(c, x + tw / 2, y + 0.55 * inch, 'All characters shown are story-world characters', align='center', size=7, dark=False)
    crop_marks(c, x, y, tw, th, 'FRONT COVER INSERT')
    c.showPage()


def back(c, man):
    tw, th = 8.5 * inch, 11 * inch
    x, y = sheet(c, tw, th)
    felt_bleed(c, x, y, tw, th, '#F4ECDC')
    B.stitch_rect(c, x + 0.32 * inch, y + 0.32 * inch, tw - 0.64 * inch, th - 0.64 * inch, 22, '#C9B48B', 1.2)
    c.setFillColor(K(B.NAVY)); c.setFont('Fredoka-Bold', 26); c.drawString(x + 0.75 * inch, y + th - 1.2 * inch, 'The cast, in their roles')
    c.setFont('Poppins', 9.5); c.setFillColor(HexColor(B.MUTED))
    c.drawString(x + 0.75 * inch, y + th - 1.48 * inch, 'The same characters do the same jobs on every page, so a teacher always knows where to look.')
    roles = [('booker', 'Booker', 'Leads Week 1 · LEARN + SMILE'), ('lumi', 'Lumi', 'Leads Week 2 · BELONG + RESET'), ('zuri', 'Zuri', 'Leads Week 3 · EXPLORE + NOURISH'),
             ('bop', 'Bop', 'Leads Week 4 · MOVE + OUTSIDE'), ('ms-june', 'Ms. June', "Teacher notes: the teacher's voice"), ('principal-hazel', 'Principal Hazel', 'Routines and safety'),
             ('mr-moss', 'Mr. Moss', 'Setting up the room, supplies'), ('ms-fern', 'Ms. Fern', 'Art and messy play'), ('tilly', 'Classmates', 'Activity examples'),
             ('bruno', 'Grown-ups', 'Family take-home cards')]
    for i, (slug, name, role) in enumerate(roles):
        col, row = i % 2, i // 2
        cx0 = x + 0.75 * inch + col * 3.55 * inch; cy0 = y + th - 2.35 * inch - row * 0.98 * inch
        tone = B.FRIEND[slug]['felt'] if slug in B.FRIEND else '#B79A66'
        B.popout(c, slug, cx0 + 0.36 * inch, cy0, 0.33 * inch, tone)
        c.setFillColor(K(B.NAVY)); c.setFont('Fredoka', 13.5); c.drawString(cx0 + 0.85 * inch, cy0 + 2, name)
        c.setFillColor(HexColor(B.MUTED)); c.setFont('Poppins', 8.6); c.drawString(cx0 + 0.85 * inch, cy0 - 11, role)
    y2 = y + th - 7.0 * inch
    c.setFillColor(K(B.NAVY)); c.setFont('Fredoka', 15); c.drawString(x + 0.75 * inch, y2, 'How to read a day page')
    keys = [('circle', 'Morning circle'), ('picture-talk', 'Picture-talk story'), ('activity', 'Connected activity'), ('move', 'Movement'),
            ('zones', 'Learning zones'), ('story', 'Read-aloud'), ('meal', 'Eat the Rainbow'), ('outside', 'Outdoor activity'),
            ('friends-live', 'Friends Live'), ('goodbye', 'Closing and take-home'), ('join', 'Everyone can join'), ('supplies', 'Supplies and setup')]
    for i, (ic, label) in enumerate(keys):
        col, row = i % 3, i // 3
        kx, ky = x + 0.75 * inch + col * 2.35 * inch, y2 - 0.42 * inch - row * 0.36 * inch
        B.badge(c, ic, kx + 9, ky + 3, 9, B.FRIEND['navy']['felt'], ring=False)
        c.setFillColor(K(B.INK)); c.setFont('Poppins', 9); c.drawString(kx + 24, ky, label)
    y3 = y2 - 1.85 * inch
    c.setFillColor(K(B.NAVY)); c.setFont('Fredoka', 15); c.drawString(x + 0.75 * inch, y3, 'Colour and the week tab')
    for i, k in enumerate(B.KEYS):
        F = B.FRIEND[k]; sx = x + 0.75 * inch + i * 1.78 * inch
        B.felt(c, sx, y3 - 0.62 * inch, 1.62 * inch, 0.42 * inch, F['felt'], r=8, inset=3, lw=.7)
        c.setFillColor(CMYKColor(0, 0, 0, 0)); c.setFont('Fredoka', 10); c.drawCentredString(sx + 0.81 * inch, y3 - 0.47 * inch, f'Week {i + 1}  {F["name"]}')
    c.setFillColor(HexColor(B.MUTED)); c.setFont('Poppins', 8.4)
    c.drawString(x + 0.75 * inch, y3 - 0.85 * inch, 'Colour is never the only signal: every block also has its drawn icon and name, and the tab position on the page edge')
    c.drawString(x + 0.75 * inch, y3 - 0.99 * inch, 'moves down one step each week, so the pages sort the same way when printed in black and white.')
    c.setFont('Poppins-SemiBold', 8.4); c.setFillColor(K(B.NAVY))
    c.drawString(x + 0.75 * inch, y + 0.68 * inch, 'Futures Friends Curriculum · Unit 1 · draft edition: written, not yet reviewed by an early-childhood reviewer.')
    c.setFont('Poppins', 7.6); c.setFillColor(HexColor(B.MUTED))
    c.drawString(x + 0.75 * inch, y + 0.52 * inch, 'All characters are story-world characters, not staff. © 2026 Futures Friends.')
    crop_marks(c, x, y, tw, th, 'BACK COVER INSERT')
    c.showPage()


def spines(c, man):
    tw, th = 3.5 * inch + 0.5 * inch, 11 * inch          # two spines side by side on one sheet: 1.5 in and 2 in
    x, y = sheet(c, tw + 2 * BLEED, th)
    for sw, sx in [(1.5 * inch, x), (2.0 * inch, x + 1.5 * inch + 2 * BLEED + 0.25 * inch)]:
        felt_bleed(c, sx, y, sw, th, B.FRIEND['navy']['felt'])
        B.stitch_rect(c, sx + 0.12 * inch, y + 0.18 * inch, sw - 0.24 * inch, th - 0.36 * inch, 10, B.FRIEND['navy']['thread'], 1)
        draw(c, B.logo('plush'), None, y + th - 0.4 * inch - sw * 0.55, w=sw * 0.84, cx=sx + sw / 2)
        c.saveState(); c.translate(sx + sw / 2, y + th / 2 - 0.55 * inch); c.rotate(90)
        c.setFillColor(CMYKColor(0, 0, 0, 0)); c.setFont('Fredoka-Bold', 30 if sw > 1.6 * inch else 24); c.drawCentredString(0, 2, 'Unit 1')
        c.setFont('Fredoka', 13 if sw > 1.6 * inch else 11); c.drawCentredString(0, -18, man['title'].replace('Unit 1: ', ''))
        c.restoreState()
        B.ground(c, sx + 0.14 * inch, y + 0.42 * inch, sw - 0.28 * inch, 9)
        B.stand(c, 'booker-hero', sx + sw / 2, y + 0.46 * inch, 1.25 * inch)
        crop_marks(c, sx, y, sw, th, f'SPINE {sw / inch:g} in')
    c.showPage()


TABS = [('Start here', 'navy', 'ms-june', 'How the unit works, the cast and the page key'),
        ('Week 1', 'booker', 'booker-hero', None), ('Week 2', 'lumi', 'lumi-waving', None), ('Week 3', 'zuri', 'zuri-pointing', None), ('Week 4', 'bop', 'bop-waving', None),
        ('Classroom printables', 'gold', 'mr-moss', 'Puppets, posters, zone signs, cards and charts'),
        ('Story sets', 'booker', 'booker-reading', 'Cue cards, read-alouds and family pages'),
        ('Families', 'lumi', 'rose', 'Take-home cards for every day')]


def dividers(c, man):
    tw, th, ext = 9 * inch, 11 * inch, 0.5 * inch           # 8.5 in body + 0.5 in tab extension
    body = tw - ext
    tab_h = (th - 0.6 * inch) / len(TABS)
    for i, (label, k, slug, note) in enumerate(TABS):
        x, y = sheet(c, tw, th)
        F = B.FRIEND[k]
        tone = F['felt']
        if k in B.KEYS and label.startswith('Week'):
            w = man['weeks'][int(label[-1]) - 1]
            note = f'{w["theme"]}  ·  {w["value"]}  ·  ends with {w["celebration"]}'
        felt_bleed(c, x, y, body, th, tone)
        c.saveState(); c.setFillColor(CMYKColor(0, 0, 0, 0)); c.rect(x + body, y - BLEED, ext + BLEED, th + 2 * BLEED, stroke=0, fill=1); c.restoreState()
        ty = y + th - 0.3 * inch - (i + 1) * tab_h
        B.felt(c, x + body - 10, ty + 3, ext + BLEED + 10, tab_h - 6, tone, r=10, stitch=False)
        B.stitch_line(c, x + body + 4, ty + 10, x + body + 4, ty + tab_h - 10, F['thread'], .8)
        c.saveState(); c.translate(x + body + ext / 2 + 3, ty + tab_h / 2); c.rotate(90)
        c.setFillColor(K(B.NAVY) if k == 'gold' else CMYKColor(0, 0, 0, 0)); c.setFont('Fredoka', B.fit_size(label, 'Fredoka', 11, tab_h - 16, 7)); c.drawCentredString(0, -4, label)
        c.restoreState()
        B.stitch_rect(c, x + 0.32 * inch, y + 0.32 * inch, body - 0.64 * inch, th - 0.64 * inch, 22, F['thread'], 1.2)
        draw(c, B.logo('plush'), x + 0.7 * inch, y + th - 1.55 * inch, h=0.9 * inch)
        ink = K(B.NAVY) if k == 'gold' else CMYKColor(0, 0, 0, 0)
        c.setFillColor(ink); c.setFont('Fredoka-Bold', B.fit_size(label, 'Fredoka-Bold', 60, body - 1.4 * inch, 30)); c.drawString(x + 0.7 * inch, y + th - 2.65 * inch, label)
        if note:
            c.setFont('Fredoka', B.fit_size(note, 'Fredoka', 16, body - 1.4 * inch, 9)); c.drawString(x + 0.7 * inch, y + th - 3.1 * inch, note)
        c.setFont('Poppins-SemiBold', 9); c.drawString(x + 0.7 * inch, y + th - 3.45 * inch, 'Futures Friends Curriculum  ·  Unit 1  ·  Draft edition')
        B.ground(c, x + 1.2 * inch, y + 0.9 * inch, body - 2.4 * inch, 16)
        slugs = [slug] if slug != 'rose' else ['rose', 'lumi-heart-hands', 'bruno', 'booker']
        if slug == 'ms-june':
            slugs = ['principal-hazel', 'ms-june', 'mr-moss']
        unit = 5.2 * inch / max(B.scale(s) for s in slugs) if len(slugs) == 1 else 4.6 * inch / max(B.scale(s) for s in slugs)
        if len(slugs) == 1:
            unit = min(unit, 4.4 * inch / B.scale(slugs[0]) if B.scale(slugs[0]) < 0.8 else 5.6 * inch / B.scale(slugs[0]))
        B.cast_row(c, slugs, x + body / 2, y + 1.0 * inch, unit, gap=0, grass=False)
        B.story_label(c, x + body / 2, y + 0.52 * inch, 'Story-world characters' if len(slugs) > 1 else 'Story-world character', align='center', size=7)
        crop_marks(c, x, y, tw, th, f'TAB DIVIDER {i + 1} of {len(TABS)}: {label.upper()}')
        c.showPage()


def mockups(pdf):
    os.makedirs(os.path.join(OUT, 'previews'), exist_ok=True)
    d = fitz.open(pdf)
    def trim(i, tw, th, dpi=110):
        pg = d[i]; off = (BLEED + MARK)
        r = fitz.Rect(off, pg.rect.height - off - th, off + tw, pg.rect.height - off)
        pix = pg.get_pixmap(dpi=dpi, clip=r)
        return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    front = trim(0, 8.5 * inch, 11 * inch); back = trim(1, 8.5 * inch, 11 * inch)
    tabs = [trim(3 + i, 9 * inch, 11 * inch) for i in range(len(TABS))]
    sp = d[2]; off = BLEED + MARK
    spine = sp.get_pixmap(dpi=110, clip=fitz.Rect(off, sp.rect.height - off - 11 * inch, off + 1.5 * inch, sp.rect.height - off))
    spine = Image.frombytes('RGB', (spine.width, spine.height), spine.samples)
    # 1. the binder standing: tabs fanned behind, cover in front, a soft floor shadow
    Wd, Hd = 2000, 1500
    bg = Image.new('RGB', (Wd, Hd), (241, 234, 220))
    g = ImageDraw.Draw(bg)
    for yy in range(Hd):
        t = yy / Hd; g.line([(0, yy), (Wd, yy)], fill=(int(246 - 18 * t), int(240 - 20 * t), int(229 - 22 * t)))
    s = 1180 / front.height
    fw, fh = int(front.width * s), int(front.height * s)
    bx, by = 600, 150
    for i, tb in enumerate(reversed(tabs)):
        tbs = tb.resize((int(tb.width * s), fh))
        sh = Image.new('L', tbs.size, 0); ImageDraw.Draw(sh).rectangle([0, 0, tbs.width, tbs.height], fill=60)
        bg.paste((40, 30, 20), (bx + 26 - i * 2 + 10, by + 12 + 6), sh.filter(ImageFilter.GaussianBlur(8)))
        bg.paste(tbs, (bx + 26 - i * 2, by + 12))
    shadow = Image.new('L', (fw + 120, fh + 120), 0)
    ImageDraw.Draw(shadow).rounded_rectangle([60, 60, fw + 60, fh + 60], 18, fill=150)
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    bg.paste((30, 25, 20), (bx - 60 + 24, by - 60 + 30), shadow)
    sw = int(1.5 * inch / 72 * 110 * s * 0.55)
    spn = spine.resize((sw, fh))
    bg.paste(spn, (bx - sw, by))
    ImageDraw.Draw(bg).rectangle([bx - sw, by, bx - sw + 6, by + fh], fill=(18, 40, 52))
    mask = Image.new('L', (fw, fh), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, fw, fh], 16, fill=255)
    bg.paste(front.resize((fw, fh)), (bx, by), mask)
    gl = Image.new('L', (fw, fh), 0); ImageDraw.Draw(gl).polygon([(0, 0), (int(fw * .55), 0), (int(fw * .2), fh), (0, fh)], fill=22)
    bg.paste((255, 255, 255), (bx, by), gl.filter(ImageFilter.GaussianBlur(30)))
    ImageDraw.Draw(bg).text((60, Hd - 70), 'Mockup: Futures Friends Curriculum, Unit 1 binder (draft edition). Print files: u1-binder-print.pdf', fill=(90, 100, 105))
    bg.save(os.path.join(OUT, 'previews', 'u1-binder-mockup.png'), optimize=True)
    # 2. flat lay: front, spine, back, then the eight tabs in two rows
    s2 = 600 / front.height
    f2 = lambda im: im.resize((int(im.width * s2), int(im.height * s2)))
    row1 = [f2(front), f2(spine), f2(back)]; row2 = [f2(t) for t in tabs]
    W2 = max(sum(i.width for i in row1) + 40 * 4, 4 * (row2[0].width + 30) + 40)
    flat = Image.new('RGB', (W2, 600 * 3 + 200), (236, 229, 214))
    xx = 40
    for im in row1:
        flat.paste(im, (xx, 40)); xx += im.width + 40
    for i, im in enumerate(row2):
        flat.paste(im, (40 + (i % 4) * (im.width + 30), 700 + (i // 4) * 660))
    flat.save(os.path.join(OUT, 'previews', 'u1-binder-flatlay.png'), optimize=True)
    return [os.path.join(OUT, 'previews', n) for n in ('u1-binder-mockup.png', 'u1-binder-flatlay.png')]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--src', default='/Volumes/FFCRM/app/hub/content/program')
    a = ap.parse_args()
    man = json.load(open(os.path.join(a.src, 'unit-1-release.json')))
    mp.fonts()
    PP.check()
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, 'u1-binder-print.pdf')
    c = canvas.Canvas(path, invariant=1)
    c.setTitle('Futures Friends Curriculum, Unit 1: binder cover, spine and tab dividers (draft edition)'); c.setAuthor('Futures Friends')
    c.setSubject('Print-ready packaging for the center welcome box'); c.setCreator('tools/make-curriculum-package.py')
    cover(c, man); back(c, man); spines(c, man); dividers(c, man)
    c.save()
    B.finish(path)
    with fitz.open(path) as d:
        print(f'{os.path.relpath(path, PP.FILES)}: {d.page_count} pages, {os.path.getsize(path) // 1024} KB')
    for m in mockups(path):
        print(os.path.relpath(m, PP.FILES))


if __name__ == '__main__':
    sys.exit(main())
