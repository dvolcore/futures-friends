#!/usr/bin/env python3
"""Builds the Unit 1 release printables (US Letter PDFs), their preview images and the site data file unit1-data.js.

    python3 tools/make-unit1-packets.py [--src /Volumes/FFCRM/app/hub/content/program]

Reads the canonical Unit 1 records and release manifest from the FFCRM repo (hub/content/program: unit-1-release.json and
unit-1/day-NN.json) and the Story Time text for Books 1 to 3 from family-library-data.js (through node, as make-printables.py
does), so every packet says exactly what the records and the site say. Uses only the site's own art (img/cut_*.webp,
img/rainbow/*.svg, img/brand/ff-plush-wordmark-640.png, img/plush/) and the self-hosted brand fonts (fonts/*.woff2, converted to TTF in a temp folder;
nothing is downloaded). Faces, blocks and boxes are plain vector shapes drawn here; no AI art.
IP LOCKDOWN (owner decision 2026-10-07): everything below is written to the PRIVATE platform repo (tools/private_paths.py:
$FF_CURRICULUM_PRIVATE/files/printables/unit-1/ and .../data/), never into this public site. Writes printables/unit-1/:
  u1-day-NN-teacher-packet.pdf (20), u1-family-take-home-cards.pdf, u1-classroom-printables.pdf, u1-story-<book>.pdf (5),
  previews/*.png, and unit1-data.js at the site root (scope, statuses, sample days and downloads for the #unit-1 page).
Each Monday packet also prints "Prep ahead this week" from unit-1-prep-ahead.json (R2-N4: what a later block, mostly Friday, uses
that is made, collected or kept earlier), and unit1-prep.js at the site root carries the same list for the teacher Today view.
ETEACH (2026-10-05):
  - E7: unit-1-supplies.json maps every material line to one catalog item, so each packet prints ONE deduplicated supply list for the
    day (and for the week on Monday), with an ordinary-supplies option for every special item and setup/supervision notes for equipment.
  - Leverage 3: every block prints the four whole-child fields (participation choices, movement alternative, meal reference, family
    connection) in the same place: the "Everyone can join" box right after "Say or ask".
  - E6 / leverage 1: printables/unit-1/start-monday/u1-day-NN-start-monday.pdf, ONE file per day with the prep list, the day packet,
    every puppet and printable page it names, the story set pages, earlier picture-talk pages Friday retells, the kitchen page and the
    family card. Every page reference inside reads "this bundle p.N"; tools/check-unit1-bundle.py proves each one resolves.
  - Leverage 2 / E10: printables/unit-1/u1-family-week-N.pdf, the week's family cards for the "This week with <friend>" page.
Needs: reportlab, fonttools (with brotli), Pillow, PyMuPDF.
"""
import argparse, hashlib, importlib.util, io, json, os, random, re, subprocess, sys

import fitz  # PyMuPDF
from PIL import Image
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Flowable, Frame, KeepTogether, PageBreak, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import ff_brand as B   # wave 10: the curriculum identity (felt, stitch, cast roles, icons); see DESIGN.md "Curriculum print system"
_spec = importlib.util.spec_from_file_location('make_printables', os.path.join(ROOT, 'tools', 'make-printables.py'))
mp = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(mp)   # shared fonts, art, colors and drawing helpers

import private_paths as PP   # IP lockdown 2026-10-07: packets and data go to the private platform repo, never the site
OUT = os.path.join(PP.FILES, 'printables', 'unit-1')
NAVY, GOLD, INK, MUTED, CREAM, C, TINT, NAME = mp.NAVY, mp.GOLD, mp.INK, mp.MUTED, mp.CREAM, mp.C, mp.TINT, mp.NAME   # C/TINT = brand deep/tint
W, H = letter
KEYS = ['booker', 'lumi', 'zuri', 'bop']
SEED = 20261005            # the three sample days (also the substitute self-check days) are drawn with this seed
LABEL = {'circle': 'Morning circle', 'picture-talk': 'Picture-talk story', 'friends-live': 'Friends Live', 'activity': 'Connected activity',
         'outside': 'Outdoor activity', 'move': 'Movement', 'zones': 'Learning zones', 'story': 'Read-aloud', 'meal': 'Eat the Rainbow at the table',
         'family': 'Family share (optional)', 'goodbye': 'Closing and take-home'}
ZONE_NAMES = ["Booker's Reading Area", "Lumi's Calm Corner", "Zuri's Discovery Zone", "Bop's Movement Zone", 'Art table']
BAND = [('Red Rockets', 'Red', '#C93B2E', ['strawberry', 'tomato']), ('Orange Sunshine', 'Orange', '#B5530C', ['carrot', 'orange']),
        ('Yellow Sunbeams', 'Yellow', '#8A6700', ['banana', 'corn']), ('Green Sprouts', 'Green', '#1F7A44', ['broccoli', 'peas']),
        ('Purple Pals', 'Blue and purple', '#5B43A8', ['blueberries', 'grapes']), ('Cozy Clouds', 'White and tan', '#6F5C44', ['cauliflower', 'bread'])]
FOOD_NAME = {'strawberry': 'Strawberry', 'tomato': 'Tomato', 'carrot': 'Carrot', 'orange': 'Orange', 'banana': 'Banana', 'corn': 'Corn', 'broccoli': 'Broccoli',
             'peas': 'Peas', 'blueberries': 'Blueberries', 'grapes': 'Grapes (quartered)', 'cauliflower': 'Cauliflower', 'bread': 'Whole-grain bread'}
DRAFT = 'DRAFT: not yet reviewed'
STATUS_WORD = {'ready': 'Ready', 'draft': 'Draft', 'unavailable': 'Not produced yet'}


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def hexof(col):
    return '#' + col.hexval()[2:]


# ---------------------------------------------------------------- input
def load(src):
    man = json.load(open(os.path.join(src, 'unit-1-release.json')))
    days = []
    h = hashlib.sha256(open(os.path.join(src, 'unit-1-release.json'), 'rb').read())
    for f in man['record_files']:
        raw = open(os.path.join(src, f), 'rb').read()
        h.update(raw)
        days.append(json.loads(raw))
    sup = os.path.join(src, 'unit-1-supplies.json')
    raw = open(sup, 'rb').read()
    man['supplies'] = json.loads(raw)
    man['supplies']['sha256'] = hashlib.sha256(raw).hexdigest()
    prep_path = os.path.join(src, 'unit-1-prep-ahead.json')
    if os.path.exists(prep_path):   # its own hash (unit1-prep.js): source_sha256 stays the records' and manifest's
        raw = open(prep_path, 'rb').read()
        man['prep_ahead'] = json.loads(raw)
        man['prep_ahead']['sha256'] = hashlib.sha256(raw).hexdigest()
    return man, days, h.hexdigest()


# R2-N4: the week's "make, collect or keep earlier" list, with each record id turned into "Day N, <block>"
def prep_week(man, days, week):
    where = {r['id']: (d['day'], LABEL.get(r['block'], r['block'])) for d, recs in zip(man['days'], days) for r in recs}
    wk = next((w for w in man.get('prep_ahead', {}).get('weeks', []) if w['week'] == week), None)
    if not wk:
        return []
    out = []
    for i in wk['items']:
        for rid in i['from'] + [f['record'] for f in i['for']]:
            if rid not in where:
                raise SystemExit(f'unit-1-prep-ahead.json: unknown record {rid}')
        uses = []
        for f in i['for']:
            u = where[f['record']]
            if u not in uses:
                uses.append(u)
        out.append({'item': i['item'], 'do': i['do'], 'from': [{'day': where[x][0], 'block': where[x][1]} for x in i['from']],
                    'for': [{'day': d, 'block': b} for d, b in uses]})
    return out


def days_text(refs):
    return '; '.join(f'Day {x["day"]} ({x["block"]})' for x in refs)


def friend_in(text, default):
    hits = [(text.find(NAME[k]), k) for k in KEYS if NAME[k] in text]
    return min(hits)[1] if hits else default


# ---------------------------------------------------------------- platypus pieces (wave 10: the stitched storybook system)
ST = {}
def styles():
    S = mp.style
    ST.update(
        h1=S(20, 'Fredoka', NAVY, lead=24), h2=S(14.5, 'Fredoka', NAVY, lead=18), h3=S(12, 'Fredoka', NAVY, lead=15),
        body=S(10.2, lead=14), small=S(8.6, color=MUTED, lead=11.5), say=S(10.2, lead=14, color=HexColor('#0B3C4E')),
        big=S(14.5, 'Fredoka', INK, lead=19), cell=S(9, lead=12), cellb=S(9, 'Poppins-SemiBold', lead=12), th=S(8.6, 'Poppins-SemiBold', NAVY, lead=11.4),
        guide=S(9.8, lead=13.6, color=INK))


def tone(k):
    return B.FRIEND[k if k in B.FRIEND else 'navy']


class Pic(Flowable):
    """A character cut-out (or a rainbow food drawing) at a fixed height, standing on a felt-grass strip when ground=True."""
    def __init__(self, ref, h, align='RIGHT', ground=False):
        super().__init__(); self.ref, self.h, self.hAlign, self.ground = ref, h, align, ground
        _, (iw, ih) = ref; self.w = self.h * iw / ih
    def wrap(self, aw, ah):
        return self.w, self.h + (4 if self.ground else 0)
    def draw(self):
        if self.ground:
            B.ground(self.canv, -6, 0, self.w + 12, 7)
        mp.draw_img(self.canv, self.ref, 0, 4 if self.ground else 0, h=self.h)


def char(key, h):
    """plush character by friend key or slug, sized for its printed height"""
    return B.char(key, h)


class IconBadge(Flowable):
    def __init__(self, name, friend, d=0.27 * inch):
        super().__init__(); self.name, self.friend, self.d = name, friend, d
    def wrap(self, aw, ah):
        return self.d, self.d
    def draw(self):
        B.badge(self.canv, self.name, self.d / 2, self.d / 2, self.d / 2, tone(self.friend)['felt'], ring=False)


class BlockHead(Flowable):
    """a lesson block's head: icon on a felt disc, the block title in the friend's ink, the facts at the right, a stitched rule"""
    def __init__(self, icon, title, meta, friend, width):
        super().__init__(); self.icon, self.title, self.meta, self.friend, self.width = icon, title, meta, friend, width
    def wrap(self, aw, ah):
        return self.width, 0.44 * inch
    def draw(self):
        c, F = self.canv, tone(self.friend)
        B.badge(c, self.icon, 0.17 * inch, 0.24 * inch, 0.17 * inch, F['felt'])
        size = B.fit_size(self.title, 'Fredoka', 14.5, self.width - 2.9 * inch, 10)
        c.setFillColor(HexColor(F['deep'])); c.setFont('Fredoka', size); c.drawString(0.43 * inch, 0.19 * inch, self.title)
        c.setFillColor(MUTED); c.setFont('Poppins', 8.2)
        c.drawRightString(self.width, 0.2 * inch, self.meta)
        B.stitch_line(c, 0.43 * inch, 0.03 * inch, self.width, 0.03 * inch, F['felt'], 1.0)


class SectionHead(Flowable):
    """a section title with its drawn icon; when a cast member owns the section (Mr. Moss sets up, Principal Hazel keeps the
    routines), their pop-out avatar and a Story-world character label sit at the right"""
    def __init__(self, title, icon, friend='navy', who=None, width=W - 1.2 * inch):
        super().__init__(); self.title, self.icon, self.friend, self.who, self.width = title, icon, friend, who, width
    def wrap(self, aw, ah):
        return self.width, (0.62 if self.who else 0.34) * inch
    def draw(self):
        c, F = self.canv, tone(self.friend)
        B.draw_icon(c, self.icon, 0, 0.06 * inch, 0.24 * inch, HexColor(F['deep']), lw=2.1)
        c.setFillColor(NAVY); size = B.fit_size(self.title, 'Fredoka', 13, self.width - (2.4 if self.who else 0.4) * inch, 9.5)
        c.setFont('Fredoka', size); c.drawString(0.33 * inch, 0.1 * inch, self.title)
        if self.who:
            r = B.ROLE[self.who]
            B.popout(c, r['slug'], self.width - 0.26 * inch, 0.24 * inch, 0.23 * inch, tone(self.friend)['felt'])
            c.setFillColor(NAVY); c.setFont('Poppins-SemiBold', 7.6); c.drawRightString(self.width - 0.6 * inch, 0.3 * inch, r['name'])
            c.setFillColor(MUTED); c.setFont('Poppins', 6.8); c.drawRightString(self.width - 0.6 * inch, 0.17 * inch, 'Story-world character')


def sect(title, icon, friend='navy', who=None):
    return SectionHead(title, icon, friend, who)


class GuideNote(Flowable):
    """a cast member's note on cream felt (story-world surface): the pop-out avatar, the name and role, then the note itself"""
    def __init__(self, who, flows, width=W - 1.26 * inch, tone_hex='#F4ECDC', friend='navy'):
        super().__init__(); self.who, self.flows, self.width, self.tone, self.friend = who, flows, width, tone_hex, friend
        self.av = 1.05 * inch; self.pad = 10
    def wrap(self, aw, ah):
        self.inner = self.width - self.av - 2 * self.pad
        self.hs = [f.wrap(self.inner, 1000)[1] for f in self.flows]
        self.h = max(sum(self.hs) + 4 * (len(self.flows) - 1) + 2 * self.pad + 2, 0.98 * inch)
        return self.width, self.h
    def draw(self):
        c = self.canv
        B.felt(c, 0, 0, self.width, self.h, self.tone, r=12, stitch=False, grain=5)
        B.stitch_rect(c, 4, 4, self.width - 8, self.h - 8, 9, '#C9B48B', .8, alpha=1)
        r = B.ROLE[self.who] if self.who in B.ROLE else {'slug': self.who, 'name': B.name_of(self.who), 'role': 'story-world character'}
        B.popout(c, r['slug'], self.av / 2 + 2, self.h - 0.46 * inch, 0.32 * inch, tone(self.friend)['felt'])
        c.setFillColor(NAVY); c.setFont('Fredoka', 9.4); c.drawCentredString(self.av / 2 + 2, self.h - 0.88 * inch, r['name'])
        c.setFillColor(MUTED); c.setFont('Poppins', 6.4); c.drawCentredString(self.av / 2 + 2, self.h - 0.99 * inch, 'Story-world character')
        y = self.h - self.pad - 1
        for f, hh in zip(self.flows, self.hs):
            f.drawOn(c, self.av + self.pad, y - hh); y -= hh + 4


class Doc(BaseDocTemplate):
    """interior pages: plain paper, the sticker logo, the title and the stitched rule in the friend's colour, the week tab.
    opener: the first page opens with a felt band instead (day packet, story set, prep list, kitchen page)"""
    def __init__(self, path, title, sub, foot, subject, friend='navy', week=None, opener=None):
        top = 1.12 * inch
        super().__init__(path, pagesize=letter, leftMargin=0.6 * inch, rightMargin=0.66 * inch, topMargin=top, bottomMargin=0.8 * inch,
                         title=title, author='Futures Friends', subject=subject, creator='tools/make-unit1-packets.py', invariant=1)
        self.h_title, self.h_sub, self.foot, self.friend, self.week, self.opener = title, sub, foot, friend, week, opener
        fr = lambda t: Frame(self.leftMargin, self.bottomMargin, self.width, H - t - self.bottomMargin, id='f', leftPadding=0, rightPadding=0)
        tpl = [PageTemplate('p', [fr(top)], onPage=self.deco)]
        if opener:
            tpl.insert(0, PageTemplate('first', [fr(opener['band'] + 0.3 * inch)], onPage=self.deco_first, autoNextPageTemplate='p'))
        self.addPageTemplates(tpl)

    def deco(self, c, doc):
        header(c, self.h_title, self.h_sub, self.friend, self.week)
        footer(c, self.foot, doc.page)

    def deco_first(self, c, doc):
        o = self.opener
        B.opener_band(c, W, H, o['band'], self.friend, o.get('kicker'), o.get('big'), o.get('title'), o.get('cast'), o.get('cast_h'),
                      icon=o.get('icon'), week=self.week)
        footer(c, self.foot, doc.page)


def header(c, title, sub, friend='navy', week=None):
    B.page_header(c, W, H, title, [x for x in sub.split(' · ') if x], friend, week)


def footer(c, text, page):
    B.page_footer(c, W, text, page)


def para(text, st='body'):
    return Paragraph(text, ST[st])


def boxed(flows, color, tint=None, pad=8):
    """a stitched panel: tint fill, rounded corners, the thread line in the friend's colour (never a heavy side bar)"""
    t = Table([[flows]], colWidths=[W - 1.26 * inch], cornerRadii=[9, 9, 9, 9])
    sty = [('BOX', (0, 0), (-1, -1), 0.9, color, 1, (3, 2.2)), ('LEFTPADDING', (0, 0), (-1, -1), pad + 4), ('RIGHTPADDING', (0, 0), (-1, -1), pad + 2),
           ('TOPPADDING', (0, 0), (-1, -1), pad), ('BOTTOMPADDING', (0, 0), (-1, -1), pad)]
    if tint is not None:
        sty.append(('BACKGROUND', (0, 0), (-1, -1), tint))
    t.setStyle(TableStyle(sty))
    return t


class Tick(Flowable):
    """An empty check box (rounded, in the friend's colour)."""
    def __init__(self, color):
        super().__init__(); self.color = color
    def wrap(self, aw, ah):
        return 10, 10
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(1.1); self.canv.roundRect(0, -1.5, 10, 10, 2.5)


def checklist(items, color):
    rows = [[Tick(color), para(esc(i), 'cell')] for i in items]
    t = Table(rows, colWidths=[0.24 * inch, W - 1.26 * inch - 0.3 * inch])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 2.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5), ('LEFTPADDING', (1, 0), (1, -1), 6)]))
    return t


def grid(rows, widths, head_color, zebra=True):
    """book-style table: tinted head row with the friend's ink, a stitched line under it, warm hairlines, faint cream zebra"""
    hx = '#' + head_color.hexval()[2:]
    F = next((v for v in B.FRIEND.values() if v['deep'].lower() == hx.lower()), B.FRIEND['navy'])
    t = Table(rows, colWidths=widths, repeatRows=1, cornerRadii=[7, 7, 0, 0])
    sty = [('BACKGROUND', (0, 0), (-1, 0), HexColor(F['tint'])), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
           ('LINEBELOW', (0, 0), (-1, 0), 1.2, head_color, 1, (3, 2.2)), ('LINEBELOW', (0, 1), (-1, -1), 0.5, HexColor('#E6DCCB')),
           ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6)]
    if zebra:
        for i in range(2, len(rows), 2):
            sty.append(('BACKGROUND', (0, i), (-1, i), HexColor('#FBF7EF')))
    t.setStyle(TableStyle(sty))
    return t


# ---------------------------------------------------------------- classroom printables (canvas; page numbers recorded)
CLASS_PAGES = {}

def cls_header(c, title, sub):
    header(c, title, sub)
    footer(c, 'Futures Friends · Unit 1 classroom printables · Draft, not reviewed · © 2026 Futures Friends. Print and copy for classroom use.', c.getPageNumber())


def face(c, cx, cy, r, kind, col):
    c.setFillColor(HexColor('#FFF6DE')); c.setStrokeColor(col); c.setLineWidth(3)
    c.circle(cx, cy, r, stroke=1, fill=1)
    c.setFillColor(INK); c.setStrokeColor(INK); c.setLineWidth(3)
    ex, ey = r * 0.36, cy + r * 0.2
    if kind == 'calm':
        for s in (-1, 1):
            c.arc(cx + s * ex - r * 0.12, ey - r * 0.08, cx + s * ex + r * 0.12, ey + r * 0.08, 180, 180)
    else:
        for s in (-1, 1):
            c.circle(cx + s * ex, ey, r * 0.075, stroke=0, fill=1)
    if kind == 'mad':
        c.line(cx - ex - r * 0.15, ey + r * 0.25, cx - ex + r * 0.15, ey + r * 0.12); c.line(cx + ex + r * 0.15, ey + r * 0.25, cx + ex - r * 0.15, ey + r * 0.12)
        c.line(cx - r * 0.3, cy - r * 0.38, cx + r * 0.3, cy - r * 0.38)
    elif kind == 'scared':
        c.line(cx - ex - r * 0.15, ey + r * 0.17, cx - ex + r * 0.12, ey + r * 0.27); c.line(cx + ex + r * 0.15, ey + r * 0.17, cx + ex - r * 0.12, ey + r * 0.27)
        c.setFillColor(HexColor('#8A3B3B')); c.ellipse(cx - r * 0.16, cy - r * 0.58, cx + r * 0.16, cy - r * 0.2, stroke=1, fill=1)
    elif kind == 'sad':
        c.arc(cx - r * 0.38, cy - r * 0.62, cx + r * 0.38, cy - r * 0.12, 20, 140)
    elif kind == 'happy':
        c.arc(cx - r * 0.45, cy - r * 0.6, cx + r * 0.45, cy + r * 0.05, 200, 140)
    elif kind == 'calm':
        c.arc(cx - r * 0.3, cy - r * 0.45, cx + r * 0.3, cy - r * 0.05, 210, 120)


def blocks(c, x, y, mode, s=0.42 * inch):
    cols = [HexColor('#23589F'), HexColor('#E7A928'), HexColor('#1B7541'), HexColor('#B02F6C'), HexColor('#A84908')]
    c.setLineWidth(1.2); c.setStrokeColor(INK)
    if mode == 'tall':
        for i in range(5):
            c.setFillColor(cols[i]); c.rect(x, y + i * s, s, s, stroke=1, fill=1)
    elif mode == 'fallen':
        for i, (dx, dy, a) in enumerate([(0, 0, 0), (1.1, 0, 12), (2.3, 0, -8), (0.5, 0.95, 30), (3.4, 0, 20)]):
            c.saveState(); c.translate(x + dx * s, y + dy * s); c.rotate(a); c.setFillColor(cols[i]); c.rect(0, 0, s, s, stroke=1, fill=1); c.restoreState()
    elif mode == 'wide':
        for row, n in enumerate([3, 2, 1, 1]):
            for j in range(n):
                c.setFillColor(cols[(row + j) % 5]); c.rect(x + (3 - n) * s / 2 + j * s, y + row * s, s, s, stroke=1, fill=1)
    elif mode == 'start':
        for i in range(2):
            c.setFillColor(cols[i]); c.rect(x, y + i * s, s, s, stroke=1, fill=1)


def card_grid(c, n, cols, rows, top=1.3 * inch, bottom=0.7 * inch):
    cw, ch = (W - 1.0 * inch) / cols, (H - top - bottom) / rows
    i, j = n % cols, n // cols
    return 0.5 * inch + i * cw, H - top - (j + 1) * ch, cw, ch


def text_in(c, text, x, y_top, w, size=11, font='Poppins', color=INK, lead=None):
    return mp.para(c, esc(text), x, y_top, w, mp.style(size, font, color, lead=lead or size * 1.3))


def classroom(man):
    path = os.path.join(OUT, 'u1-classroom-printables.pdf')
    c = mp.canvas.Canvas(path, pagesize=letter, invariant=1)
    c.setTitle('Unit 1 classroom printables'); c.setAuthor('Futures Friends'); c.setSubject('Futures Friends Unit 1 printable classroom materials (draft)'); c.setCreator('tools/make-unit1-packets.py')
    contents = []

    def start(aid, title, sub, felt_page=None):
        CLASS_PAGES.setdefault(aid, c.getPageNumber())
        if felt_page:                    # a poster: the whole page is felt in the friend's colour; title on the felt, footer kept
            B.felt(c, 0, 0.78 * inch, W, H - 0.78 * inch, B.FRIEND[felt_page]['felt'], stitch=False)
            B.stitch_rect(c, 0.3 * inch, 1.0 * inch, W - 0.6 * inch, H - 1.3 * inch, 18, B.FRIEND[felt_page]['thread'], 1.4)
            B.draft_pill(c, W - 0.55 * inch, H - 0.62 * inch, on_felt=True)
            footer(c, 'Futures Friends · Unit 1 classroom printables · Draft, not reviewed · © 2026 Futures Friends. Print and copy for classroom use.', c.getPageNumber())
        else:
            cls_header(c, title, sub)
        if aid not in [a for a, _ in contents]:
            contents.append((aid, title))

    # p1 contents placeholder (drawn at the end into page 1 is not possible with canvas; draw a fixed list instead)
    order = ['puppet:u1-stick-puppets', 'print:u1-friend-posters', 'print:u1-zone-signs', 'print:u1-rainbow-bands', 'print:u1-songs-card', 'print:u1-feeling-faces',
             'print:u1-book-helper-chart', 'print:u1-story-builders', 'print:u1-name-cards', 'print:u1-achievement-charts', 'print:u1-greeting-board',
             'print:u1-calm-board', 'print:u1-wonder-sheets', 'print:u1-sink-float-chart', 'print:u1-relay-labels', 'print:u1-movement-cards', 'print:u1-food-cards']
    B.opener_band(c, W, H, 3.0 * inch, 'navy', ['Unit 1', 'Classroom printables', 'Draft, not reviewed'], 'Classroom printables',
                  None, cast=['mr-moss', 'lumi', 'booker-hero', 'zuri', 'bop'], cast_h=1.75 * inch)
    footer(c, 'Futures Friends · Unit 1 classroom printables · Draft, not reviewed · © 2026 Futures Friends. Print and copy for classroom use.', 1)
    B.story_label(c, W - 0.55 * inch, H - 3.0 * inch - 0.32 * inch, 'Mr. Moss and the four friends: story-world characters', align='right')
    y = H - 3.55 * inch
    y -= text_in(c, 'Print what a day needs. Every page works without a screen, an app or the internet.', 0.6 * inch, y, W - 1.2 * inch, 12, 'Fredoka', NAVY) + 8
    y -= text_in(c, 'These pages stand in for boxed kit items that are not produced yet (plush, posters, picture-card sets, the rainbow wall kit) and add the charts and cards the Unit 1 days use. Each day packet names the pages it needs. All pages are drafts awaiting review.', 0.6 * inch, y, W - 1.2 * inch, 10.5) + 12
    # the page numbers are fixed by the build order below; they are checked against CLASS_PAGES after the build
    y -= 6
    c.setFillColor(NAVY); c.setFont('Fredoka', 15); c.drawString(0.6 * inch, y - 14, 'Contents'); y -= 26
    B.stitch_line(c, 0.6 * inch, y + 4, W - 0.66 * inch, y + 4, B.FRIEND['navy']['felt'], 1)
    toc_y = y - 8
    c.showPage()

    # stick puppets: 2 per page
    for i, k in enumerate(KEYS):
        if i % 2 == 0:
            start('puppet:u1-stick-puppets', 'Friend stick puppets', 'Cut on the dashed line, tape a craft stick behind the tab, and tell the story. They stand in for the plush.')
        y0 = H - 1.35 * inch - (i % 2 + 1) * 4.55 * inch
        mp.cutline(c, 0.9 * inch, y0 + 0.15 * inch, W - 1.8 * inch, 4.3 * inch)
        mp.draw_img(c, char(B.POSE[k]['opener'], 3.7 * inch), None, y0 + 0.55 * inch, h=3.7 * inch, cx=W / 2)
        B.felt(c, 1.05 * inch, y0 + 3.72 * inch, 1.45 * inch, 0.46 * inch, B.FRIEND[k]['felt'], r=9, inset=3.5, lw=.8)
        c.setFillColor(white); c.setFont('Fredoka', 20); c.drawCentredString(1.775 * inch, y0 + 3.86 * inch, NAME[k])
        c.setStrokeColor(MUTED); c.setDash(3, 3); c.rect(W / 2 - 0.35 * inch, y0 + 0.2 * inch, 0.7 * inch, 0.35 * inch); c.setDash()
        c.setFont('Poppins', 7.5); c.setFillColor(MUTED); c.drawCentredString(W / 2, y0 + 0.33 * inch, 'tape stick here')
        if i % 2 == 1:
            c.showPage()
    # posters
    PIL = {'booker': 'LEARN · SMILE', 'lumi': 'BELONG · RESET', 'zuri': 'EXPLORE · NOURISH', 'bop': 'MOVE · OUTSIDE'}
    LINE = {'booker': 'Brave learners build brighter tomorrows.', 'lumi': 'Kindness brightens every day.', 'zuri': 'Curious minds go further.', 'bop': 'Move your body, grow your mind.'}
    VAL = {w['lead']: w['value'] for w in man['weeks']}
    ZONE = {'booker': "Booker's Reading Area", 'lumi': "Lumi's Calm Corner", 'zuri': "Zuri's Discovery Zone", 'bop': "Bop's Movement Zone"}
    for k in KEYS:
        start('print:u1-friend-posters', f'{NAME[k]}', 'Friend poster, letter size. The 18 x 24 inch printed posters are not produced yet.', felt_page=k)
        lr, (lw_, lh_) = B.logo('plush'); c.drawImage(lr, W / 2 - 0.62 * inch * lw_ / lh_ / 2, H - 1.02 * inch, width=0.62 * inch * lw_ / lh_, height=0.62 * inch, mask='auto')
        c.setFillColor(white); c.setFont('Fredoka-Bold', 64); c.drawCentredString(W / 2, H - 1.85 * inch, NAME[k])
        B.segs(c, [PIL[k], VAL[k]], W / 2 - (stringWidth(PIL[k] + VAL[k], 'Poppins-SemiBold', 14) + 18) / 2, H - 2.25 * inch, 14, 'Poppins-SemiBold', '#FFFFFF', B.FRIEND[k]['thread'])
        pose = B.POSE[k]['opener']
        B.ground(c, 1.4 * inch, 2.42 * inch, W - 2.8 * inch, 14)
        mp.draw_img(c, char(pose, 5.4 * inch), None, 2.5 * inch, h=5.4 * inch, cx=W / 2)
        c.setFillColor(white); c.setFont('Fredoka', 22); c.drawCentredString(W / 2, 1.78 * inch, LINE[k])
        c.setFont('Poppins-SemiBold', 11.5); c.drawCentredString(W / 2, 1.38 * inch, ZONE[k])
        c.showPage()
    # zone signs: 2 per page
    ZS = [('booker', "Booker's Reading Area", 'Read, listen, retell and try again.'), ('lumi', "Lumi's Calm Corner", 'A place to feel calm. Always a choice.'),
          ('zuri', "Zuri's Discovery Zone", 'Look closely. Wonder. Try it.'), ('bop', "Bop's Movement Zone", 'Move, dance and play.'),
          ('gold', 'Art table', 'Make it your way.'), ('gold', 'Eat the Rainbow', 'Look, smell, touch, taste. Trying is the goal.')]
    for i, (k, t, s) in enumerate(ZS):
        if i % 2 == 0:
            start('print:u1-zone-signs', 'Zone signs', 'Post one sign at each zone. The four friends\' zones, the art table and the Eat the Rainbow wall.')
        y0 = H - 1.35 * inch - (i % 2 + 1) * 4.55 * inch
        zt = {'Art table': 'navy', 'Eat the Rainbow': 'zuri'}.get(t, k)
        B.felt(c, 0.6 * inch, y0 + 0.15 * inch, W - 1.2 * inch, 4.3 * inch, B.FRIEND[zt]['felt'], r=18, thread=B.FRIEND[zt]['thread'], inset=9, lw=1.3)
        B.ground(c, W - 3.75 * inch, y0 + 0.48 * inch, 2.7 * inch, 11)
        if k in KEYS:
            mp.draw_img(c, char(B.POSE[k]['opener'], 3.5 * inch), None, y0 + 0.55 * inch, h=3.5 * inch, cx=W - 2.4 * inch)
        elif t == 'Art table':          # Ms. Fern owns art and messy play
            mp.draw_img(c, B.prop('art-supplies'), None, y0 + 0.55 * inch, h=1.3 * inch, cx=W - 3.0 * inch)
            mp.draw_img(c, char('ms-fern', 3.4 * inch), None, y0 + 0.55 * inch, h=3.4 * inch, cx=W - 1.85 * inch)
            B.story_label(c, W - 0.85 * inch, y0 + 0.28 * inch, 'Ms. Fern: story-world character', align='right', dark=True)
        else:
            for n, (nm, _, hx, fs) in enumerate(BAND):
                mp.draw_img(c, mp.food(fs[0]), W - 4.3 * inch + (n % 3) * 0.78 * inch, y0 + 3.0 * inch - (n // 3) * 0.86 * inch, h=0.7 * inch)
            mp.draw_img(c, char('zuri-apple', 2.4 * inch), None, y0 + 0.55 * inch, h=2.4 * inch, cx=W - 1.6 * inch)
        fs = 34
        while stringWidth(t, 'Fredoka-Bold', fs) > W - 4.9 * inch and fs > 18:
            fs -= 1
        c.setFillColor(white); c.setFont('Fredoka-Bold', fs); c.drawString(1.0 * inch, y0 + 2.6 * inch, t)
        text_in(c, s, 1.0 * inch, y0 + 2.2 * inch, 3.4 * inch, 15, color=white)
        if i % 2 == 1:
            c.showPage()
    # rainbow band labels: 3 per page
    for i, (nm, col, hx, fs) in enumerate(BAND):
        if i % 3 == 0:
            start('print:u1-rainbow-bands', 'Rainbow wall band labels', 'Six color names, not health claims. Children add a sticker for looking, smelling, touching or tasting.')
        y0 = H - 1.35 * inch - (i % 3 + 1) * 3.05 * inch
        c.setFillColor(HexColor(hx)); c.roundRect(0.6 * inch, y0 + 0.15 * inch, W - 1.2 * inch, 2.85 * inch, 16, stroke=0, fill=1)
        c.setFillColor(white); c.roundRect(0.85 * inch, y0 + 0.4 * inch, 2.6 * inch, 2.35 * inch, 12, stroke=0, fill=1)
        for n, f in enumerate(fs):
            mp.draw_img(c, mp.food(f), 1.0 * inch + n * 1.2 * inch, y0 + 1.0 * inch, h=1.1 * inch)
        c.setFillColor(white); c.setFont('Fredoka', 36); c.drawString(3.8 * inch, y0 + 1.75 * inch, nm)
        c.setFont('Poppins-SemiBold', 14); c.drawString(3.8 * inch, y0 + 1.3 * inch, col)
        if i % 3 == 2:
            c.showPage()
    # songs: flowing text pages
    songs = man['songs']
    start('print:u1-songs-card', 'Songs and chants', 'Sing them the same way every day. Public-domain tunes; no recording needed.')
    y = H - 1.4 * inch
    for s in songs:
        hgt = 0.55 * inch + 0.2 * inch * (len(s['words']) // 85 + 1)
        if y - hgt < 0.8 * inch:
            c.showPage(); start('print:u1-songs-card', 'Songs and chants (continued)', 'Sing them the same way every day. Public-domain tunes; no recording needed.'); y = H - 1.4 * inch
        c.setFillColor(C['bop']); c.setFont('Fredoka', 13.5); c.drawString(0.6 * inch, y - 12, s['name'])
        c.setFillColor(MUTED); c.setFont('Poppins', 8.5); c.drawRightString(W - 0.6 * inch, y - 12, 'Tune: ' + s['tune'])
        y -= 18 + text_in(c, s['words'], 0.6 * inch, y - 18, W - 1.2 * inch, 10.5) + 10
    c.showPage()
    # feeling faces: 6 per page (2 x 3)
    start('print:u1-feeling-faces', 'Feeling Faces cards', 'Cut apart. Happy, sad, mad, scared, calm, and one blank to draw a feeling.')
    FACES = [('happy', 'happy', 'zuri'), ('sad', 'sad', 'booker'), ('mad', 'mad', 'bop'), ('scared', 'scared', 'lumi'), ('calm', 'calm', 'lumi'), ('', 'draw a feeling', 'gold')]
    for n, (kind, word, k) in enumerate(FACES):
        x, y, cw, ch = card_grid(c, n, 2, 3)
        mp.cutline(c, x, y, cw, ch)
        if kind:
            face(c, x + cw / 2, y + ch / 2 + 0.25 * inch, 1.05 * inch, kind, C[k])
        else:
            c.setStrokeColor(MUTED); c.setDash(4, 4); c.circle(x + cw / 2, y + ch / 2 + 0.25 * inch, 1.05 * inch); c.setDash()
        c.setFillColor(C[k]); c.setFont('Fredoka', 22); c.drawCentredString(x + cw / 2, y + 0.3 * inch, word)
    c.showPage()
    # book helper chart
    start('print:u1-book-helper-chart', 'Book Helper rules', "Booker's Reading Area. Act out each rule with a real book.")
    for n, (t, s) in enumerate([('Two hands', 'Hold the book with two hands.'), ('Gentle pages', 'Turn one page at a time, slowly.'), ('Back on the shelf', 'Put the book home when you finish.')]):
        y0 = H - 1.4 * inch - (n + 1) * 2.95 * inch
        mp.stitch(c, 0.6 * inch, y0, W - 1.2 * inch, 2.8 * inch, C['booker'], fill=TINT['booker'])
        c.setFillColor(C['booker']); c.setFont('Fredoka', 64); c.drawString(0.95 * inch, y0 + 1.0 * inch, str(n + 1))
        c.setFont('Fredoka', 30); c.drawString(2.0 * inch, y0 + 1.6 * inch, t)
        text_in(c, s, 2.0 * inch, y0 + 1.3 * inch, 3.5 * inch, 14)
        bx = W - 2.6 * inch                                     # a simple open book
        c.setFillColor(white); c.setStrokeColor(C['booker']); c.setLineWidth(2.5)
        c.roundRect(bx, y0 + 0.7 * inch, 0.9 * inch, 1.25 * inch, 6, stroke=1, fill=1); c.roundRect(bx + 0.9 * inch, y0 + 0.7 * inch, 0.9 * inch, 1.25 * inch, 6, stroke=1, fill=1)
        if n == 2:
            c.line(bx - 0.1 * inch, y0 + 0.62 * inch, bx + 1.9 * inch, y0 + 0.62 * inch)
    c.showPage()
    # story builders: 2 per page
    SB = [('1', 'Booker starts building.', 'start', ['booker']), ('2', 'The tower falls down. Booker feels frustrated.', 'fallen', ['booker']),
          ('3', 'Booker takes a big breath and asks Zuri for an idea.', None, ['booker', 'zuri']), ('4', 'A wider base. The tower stands tall!', 'wide', ['booker'])]
    for i, (num, t, mode, who) in enumerate(SB):
        if i % 2 == 0:
            start('print:u1-story-builders', 'Story Builders: Booker Tries Again', 'Cut apart, mix up, and put in order: first, next, then, last.')
        y0 = H - 1.35 * inch - (i % 2 + 1) * 4.55 * inch
        mp.cutline(c, 0.6 * inch, y0 + 0.15 * inch, W - 1.2 * inch, 4.3 * inch)
        c.setFillColor(GOLD); c.circle(1.1 * inch, y0 + 3.85 * inch, 0.3 * inch, stroke=0, fill=1)
        c.setFillColor(NAVY); c.setFont('Fredoka', 24); c.drawCentredString(1.1 * inch, y0 + 3.75 * inch, num)
        for n, k in enumerate(who):
            pose = {('booker', 0): 'booker-hero', ('booker', 1): 'booker-thinking', ('booker', 2): 'booker-waving', ('zuri', 2): 'zuri-pointing', ('booker', 3): 'booker-hero'}.get((k, i), k)
            B.ground(c, 0.9 * inch + n * 1.9 * inch, y0 + 0.44 * inch, 1.9 * inch, 9)
            mp.draw_img(c, char(pose, 2.9 * inch), None, y0 + 0.5 * inch, h=2.9 * inch, cx=1.85 * inch + n * 1.9 * inch)
        if mode:
            blocks(c, W - 3.4 * inch, y0 + 0.6 * inch, mode)
        text_in(c, t, 1.6 * inch, y0 + 4.05 * inch, W - 2.4 * inch, 16, 'Fredoka', C['booker'])
        if i % 2 == 1:
            c.showPage()
    # name cards: 8 per page
    start('print:u1-name-cards', 'Name cards', 'Write each name the way the family says and spells it. Glue a photo in the box (twos use the photo).')
    for n in range(8):
        x, y, cw, ch = card_grid(c, n, 2, 4)
        mp.cutline(c, x, y, cw, ch)
        c.setStrokeColor(MUTED); c.setDash(3, 3); c.rect(x + 0.2 * inch, y + 0.25 * inch, 1.3 * inch, ch - 0.5 * inch); c.setDash()
        c.setFillColor(MUTED); c.setFont('Poppins', 8); c.drawCentredString(x + 0.85 * inch, y + ch / 2, 'photo')
        c.setStrokeColor(INK); c.line(x + 1.7 * inch, y + 0.6 * inch, x + cw - 0.2 * inch, y + 0.6 * inch)
    c.showPage()
    # friend charts + achievement card
    for k in KEYS:
        start('print:u1-achievement-charts', f'Our class {NAME[k]} chart', 'A sticker for practicing and trying. Every child gets one. No scores, no comparing.')
        mp.draw_img(c, char(B.POSE[k]['opener'], 1.75 * inch), None, H - 3.2 * inch, h=1.75 * inch, cx=W - 1.35 * inch)
        c.setFillColor(C[k]); c.setFont('Fredoka', 30); c.drawString(0.7 * inch, H - 2.0 * inch, f'We practiced with {NAME[k]}!')
        for n in range(24):
            cx, cy = 1.25 * inch + (n % 6) * 1.2 * inch, H - 3.9 * inch - (n // 6) * 1.55 * inch
            c.setStrokeColor(C[k]); c.setLineWidth(2); c.setDash(4, 3); c.circle(cx, cy, 0.48 * inch); c.setDash()
        c.showPage()
    start('print:u1-achievement-charts', 'Futures Friends achievement card', 'Day 20: a sticker for each friend while the child says one thing they learned. Two cards per page.')
    for half in range(2):
        y0 = H - 1.35 * inch - (half + 1) * 4.55 * inch
        mp.cutline(c, 0.6 * inch, y0 + 0.15 * inch, W - 1.2 * inch, 4.3 * inch)
        c.setFillColor(NAVY); c.setFont('Fredoka', 20); c.drawCentredString(W / 2, y0 + 3.95 * inch, 'I met the Futures Friends!')
        for n, k in enumerate(KEYS):
            cx = 1.35 * inch + n * 1.95 * inch
            mp.draw_img(c, mp.art(k), None, y0 + 2.2 * inch, h=1.3 * inch, cx=cx)
            c.setStrokeColor(C[k]); c.setLineWidth(2); c.setDash(4, 3); c.circle(cx, y0 + 1.55 * inch, 0.45 * inch); c.setDash()
            c.setFillColor(C[k]); c.setFont('Fredoka', 12); c.drawCentredString(cx, y0 + 0.85 * inch, NAME[k])
        c.setFillColor(INK); c.setFont('Poppins', 10); c.drawString(0.9 * inch, y0 + 0.4 * inch, 'Name: ______________________________      Date: ______________')
    c.showPage()
    # greeting board
    start('print:u1-greeting-board', 'How do you like to say hello?', 'Greeting choice board. Every choice is equal; touch is never required.')
    GR = [('Wave', 'lumi'), ('High five', 'bop'), ('Fist bump', 'booker'), ('Elbow bump', 'zuri'), ('Hug', 'lumi')]
    GR_POSE = {'Wave': 'lumi-waving', 'High five': 'bop-waving', 'Fist bump': 'booker-hero', 'Elbow bump': 'zuri-pointing', 'Hug': 'lumi-heart-hands'}
    for n, (t, k) in enumerate(GR):
        x, y, cw, ch = card_grid(c, n, 2, 3)
        mp.stitch(c, x + 6, y + 6, cw - 12, ch - 12, C[k], fill=TINT[k])
        B.ground(c, x + cw - 1.6 * inch, y + 0.26 * inch, 1.25 * inch, 8)
        mp.draw_img(c, char(GR_POSE[t], 1.7 * inch), None, y + 0.3 * inch, h=1.7 * inch, cx=x + cw - 0.98 * inch)
        c.setFillColor(C[k]); c.setFont('Fredoka', 24); c.drawString(x + 0.3 * inch, y + ch / 2, t)
    c.showPage()
    # calm board + my calm plan
    start('print:u1-calm-board', "Lumi's calm-down choices", 'Post in the Calm Corner. A choice, never a consequence.')
    CB = [('Bunny breaths', 'Sniff, sniff, sniff... whoosh.'), ('Squeeze and let go', 'Squeeze a soft ball for 3. Let go.'), ('Hug a friend', 'Hug the Lumi puppet or a soft toy.'),
          ('Family photos', 'Look at the people who love you.'), ('Sand timer', 'Sit and watch the sand fall.'), ('Wall push', 'Push the wall, strong and slow.')]
    for n, (t, s) in enumerate(CB):
        x, y, cw, ch = card_grid(c, n, 2, 3)
        mp.stitch(c, x + 6, y + 6, cw - 12, ch - 12, C['lumi'], fill=TINT['lumi'])
        c.setFillColor(C['lumi']); c.setFont('Fredoka', 22); c.drawString(x + 0.35 * inch, y + ch - 0.7 * inch, t)
        text_in(c, s, x + 0.35 * inch, y + ch - 0.9 * inch, cw - 1.9 * inch, 12)
        B.ground(c, x + cw - 1.55 * inch, y + 0.26 * inch, 1.15 * inch, 8)
        mp.draw_img(c, char('lumi-calm-breath', 1.6 * inch), None, y + 0.3 * inch, h=1.6 * inch, cx=x + cw - 0.98 * inch)
    c.showPage()
    start('print:u1-calm-board', 'My Calm Plan', 'Each child puts a sticker by the choice that helps most. Four cards per page.')
    for n in range(4):
        x, y, cw, ch = card_grid(c, n, 2, 2)
        mp.cutline(c, x, y, cw, ch)
        c.setFillColor(C['lumi']); c.setFont('Fredoka', 18); c.drawString(x + 0.25 * inch, y + ch - 0.5 * inch, 'My Calm Plan')
        c.setFillColor(INK); c.setFont('Poppins', 9); c.drawString(x + 0.25 * inch, y + ch - 0.8 * inch, 'Name: ____________________')
        for m, (t, _) in enumerate(CB):
            yy = y + ch - 1.2 * inch - m * 0.42 * inch
            c.setStrokeColor(C['lumi']); c.circle(x + 0.4 * inch, yy + 4, 0.13 * inch)
            c.setFillColor(INK); c.setFont('Poppins', 11); c.drawString(x + 0.65 * inch, yy, t)
    c.showPage()
    # wonder sheets
    start('print:u1-wonder-sheets', 'I Wonder leaves', 'Write each child\'s question and name on a leaf, then post it on the I Wonder wall.')
    for n in range(6):
        x, y, cw, ch = card_grid(c, n, 2, 3)
        c.setFillColor(TINT['zuri']); c.setStrokeColor(C['zuri']); c.setLineWidth(2)
        c.ellipse(x + 0.2 * inch, y + 0.2 * inch, x + cw - 0.2 * inch, y + ch - 0.2 * inch, stroke=1, fill=1)
        c.line(x + 0.35 * inch, y + ch / 2, x + cw - 0.35 * inch, y + ch / 2)
        c.setFillColor(C['zuri']); c.setFont('Fredoka', 15); c.drawString(x + 0.85 * inch, y + ch - 0.75 * inch, 'I wonder...')
        c.setFont('Poppins', 9); c.drawCentredString(x + cw / 2, y + 0.55 * inch, 'Name: __________________')
    c.showPage()
    start('print:u1-wonder-sheets', 'Scientist Sheet', 'Look closely with a magnifier. Draw it big in the circle. The teacher writes two words the child says.')
    c.setStrokeColor(C['zuri']); c.setLineWidth(3); c.circle(W / 2, H / 2 + 0.3 * inch, 3.0 * inch)
    c.setFillColor(INK); c.setFont('Poppins', 12)
    c.drawString(0.8 * inch, 1.6 * inch, 'I looked at: _______________________________________')
    c.drawString(0.8 * inch, 1.1 * inch, 'Two words: ________________   ________________')
    c.drawString(0.8 * inch, 0.75 * inch, 'Name: ______________________')
    mp.draw_img(c, char('zuri-magnifier', 1.5 * inch), None, H - 3.0 * inch, h=1.5 * inch, cx=W - 1.1 * inch)
    c.showPage()
    start('print:u1-wonder-sheets', 'Nature Detective rules', 'Read the rules together before going outside. Point to each one.')
    B.popout(c, 'principal-hazel', W - 1.0 * inch, H - 1.38 * inch - 0.5 * inch, 0.32 * inch, B.FRIEND['zuri']['felt'])   # Principal Hazel keeps us safe
    B.story_label(c, W - 1.45 * inch, H - 1.38 * inch - 0.62 * inch, 'Principal Hazel: story-world character', align='right')
    NR = ['Stay with your group.', 'Gentle hands.', 'Only collect things on the ground.', 'Never put things in your mouth.', 'Leave living animals where they are.']
    for n, t in enumerate(NR):
        y0 = H - 2.05 * inch - (n + 1) * 1.5 * inch
        mp.stitch(c, 0.6 * inch, y0, W - 1.2 * inch, 1.36 * inch, C['zuri'], fill=TINT['zuri'])
        c.setFillColor(C['zuri']); c.setFont('Fredoka', 34); c.drawString(0.95 * inch, y0 + 0.45 * inch, str(n + 1))
        c.setFont('Fredoka', 24); c.drawString(1.8 * inch, y0 + 0.52 * inch, t)
    c.showPage()
    start('print:u1-wonder-sheets', 'Detective Report', 'Draw three things you found. The teacher writes the labels.')
    for n in range(3):
        y0 = H - 1.45 * inch - (n + 1) * 2.95 * inch
        c.setStrokeColor(C['zuri']); c.setLineWidth(2); c.roundRect(0.6 * inch, y0, W - 1.2 * inch, 2.8 * inch, 14)
        c.setFillColor(C['zuri']); c.setFont('Fredoka', 18); c.drawString(0.85 * inch, y0 + 2.4 * inch, f'Find {n + 1}')
        c.setStrokeColor(INK); c.setLineWidth(1); c.line(0.85 * inch, y0 + 0.35 * inch, 4.0 * inch, y0 + 0.35 * inch)
    c.showPage()
    # sink float chart
    start('print:u1-sink-float-chart', 'Sink or float?', 'Guess first (thumbs up for float, down for sink), then test. One tally mark per object.')
    half = (W - 1.2 * inch) / 2
    for n, (t, k) in enumerate([('FLOAT', 'booker'), ('SINK', 'zuri')]):
        x0 = 0.6 * inch + n * half
        c.setFillColor(TINT[k]); c.setStrokeColor(C[k]); c.setLineWidth(2); c.roundRect(x0 + 6, 0.9 * inch, half - 12, H - 2.5 * inch, 14, stroke=1, fill=1)
        c.setFillColor(C[k]); c.setFont('Fredoka', 40); c.drawCentredString(x0 + half / 2, H - 2.2 * inch, t)
        c.setStrokeColor(C[k]); c.setLineWidth(4)
        ax = x0 + half / 2
        if t == 'FLOAT':
            c.line(ax, H - 3.6 * inch, ax, H - 2.6 * inch); c.line(ax - 0.3 * inch, H - 2.9 * inch, ax, H - 2.6 * inch); c.line(ax + 0.3 * inch, H - 2.9 * inch, ax, H - 2.6 * inch)
        else:
            c.line(ax, H - 2.6 * inch, ax, H - 3.6 * inch); c.line(ax - 0.3 * inch, H - 3.3 * inch, ax, H - 3.6 * inch); c.line(ax + 0.3 * inch, H - 3.3 * inch, ax, H - 3.6 * inch)
    c.showPage()
    # relay labels: 2 per page
    RL = [('Blocks', 'tall'), ('Books', None), ('Scarves', None), ('Balls', None)]
    for i, (t, mode) in enumerate(RL):
        if i % 2 == 0:
            start('print:u1-relay-labels', 'Clean-Up Relay labels', 'Tape one label on each basket. Children match each toy to its picture.')
        y0 = H - 1.35 * inch - (i % 2 + 1) * 4.55 * inch
        mp.stitch(c, 0.6 * inch, y0 + 0.15 * inch, W - 1.2 * inch, 4.3 * inch, C['bop'], fill=TINT['bop'])
        c.setFillColor(C['bop']); c.setFont('Fredoka', 54); c.drawString(1.0 * inch, y0 + 2.0 * inch, t)
        gx, gy = W - 3.0 * inch, y0 + 0.9 * inch
        c.setLineWidth(2.5); c.setStrokeColor(INK)
        if t == 'Blocks':
            blocks(c, gx + 0.3 * inch, gy - 0.2 * inch, 'wide', s=0.55 * inch)
        elif t == 'Books':
            for n, col in enumerate(['#23589F', '#B02F6C', '#1B7541', '#A84908']):
                c.setFillColor(HexColor(col)); c.rect(gx + n * 0.42 * inch, gy, 0.36 * inch, 2.2 * inch - n * 0.15 * inch, stroke=1, fill=1)
        elif t == 'Scarves':
            for n, col in enumerate(['#B02F6C', '#E7A928', '#23589F']):
                p = c.beginPath(); y1 = gy + 0.4 * inch + n * 0.6 * inch; p.moveTo(gx, y1)
                for s in range(6):
                    p.curveTo(gx + (s + .3) * 0.33 * inch, y1 + 0.25 * inch, gx + (s + .6) * 0.33 * inch, y1 - 0.25 * inch, gx + (s + 1) * 0.33 * inch, y1)
                c.setStrokeColor(HexColor(col)); c.setLineWidth(9); c.drawPath(p, stroke=1, fill=0)
        else:
            for n, col in enumerate(['#C93B2E', '#1B7541', '#23589F']):
                c.setFillColor(HexColor(col)); c.setStrokeColor(INK); c.setLineWidth(2); c.circle(gx + 0.3 * inch + n * 0.75 * inch, gy + 0.6 * inch + (n % 2) * 0.9 * inch, 0.38 * inch, stroke=1, fill=1)
        if i % 2 == 1:
            c.showPage()
    # movement cards: 4 per page
    MV = [('Stomp', 'Stomp like Bop: big, heavy feet.', 'bop'), ('Hop', 'Hop like Lumi. Twos can bounce with bent knees.', 'lumi'), ('Clap', 'Clap your hands, one, two.', 'booker'),
          ('Jump', 'Jump with two feet. Land softly.', 'bop'), ('Spin', 'Turn around slowly, once.', 'zuri'), ('Freeze', 'Stop like a statue.', 'booker'),
          ('Bunny', 'Yoga: crouch, hands down, ears up tall.', 'lumi'), ('Turtle', 'Yoga: curl up small in your shell.', 'zuri'), ('Tree', 'Yoga: stand tall, arms up like branches.', 'booker')]
    for i, (t, s, k) in enumerate(MV):
        if i % 4 == 0:
            start('print:u1-movement-cards', 'Movement cards', 'Pattern cards and yoga cards. Every move can be done seated: "stomp" becomes "pat knees."')
        x, y, cw, ch = card_grid(c, i % 4, 2, 2)
        mp.cutline(c, x, y, cw, ch); mp.stitch(c, x + 8, y + 8, cw - 16, ch - 16, C[k], fill=TINT[k])
        mv = {'Stomp': 'bop-walk-in', 'Hop': 'lumi-hop', 'Clap': 'booker-waving', 'Jump': 'bop-dancing', 'Spin': 'zuri-peek', 'Freeze': 'booker-thinking',
              'Bunny': 'lumi-hop', 'Turtle': 'zuri', 'Tree': 'booker-hero'}[t]
        B.ground(c, x + cw / 2 - 0.9 * inch, y + 1.11 * inch, 1.8 * inch, 8)
        mp.draw_img(c, char(mv, 2.4 * inch), None, y + 1.15 * inch, h=2.4 * inch, cx=x + cw / 2)
        c.setFillColor(C[k]); c.setFont('Fredoka', 28); c.drawCentredString(x + cw / 2, y + 0.75 * inch, t)
        text_in(c, s, x + 0.3 * inch, y + 0.6 * inch, cw - 0.6 * inch, 9.5)
        if i % 4 == 3 or i == len(MV) - 1:
            c.showPage()
    # food picture cards: 6 per page
    foods = [(f, nm, hx) for nm, _, hx, fs in BAND for f in fs]
    for i, (f, nm, hx) in enumerate(foods):
        if i % 6 == 0:
            start('print:u1-food-cards', 'Food picture cards', 'Cut apart. Sort by color band. Pictures work for every child, whatever their meal plan.')
        x, y, cw, ch = card_grid(c, i % 6, 2, 3)
        mp.cutline(c, x, y, cw, ch)
        c.setFillColor(HexColor(hx)); c.rect(x, y + ch - 0.32 * inch, cw, 0.32 * inch, stroke=0, fill=1)
        c.setFillColor(white); c.setFont('Poppins-SemiBold', 10); c.drawCentredString(x + cw / 2, y + ch - 0.23 * inch, nm)
        mp.draw_img(c, mp.food(f), x + cw / 2 - 0.8 * inch, y + 0.6 * inch, h=1.6 * inch)
        c.setFillColor(INK); c.setFont('Fredoka', 18); c.drawCentredString(x + cw / 2, y + 0.25 * inch, FOOD_NAME[f])
        if i % 6 == 5:
            c.showPage()
    c.save()
    # contents page: redraw page 1 now that the page numbers are known
    doc = fitz.open(path)
    pg = doc[0]
    y = H - toc_y + 14
    for aid in order:
        t = man['assets'][aid]['title']
        fnt = fitz.Font(fontfile=mp.FONT_FILES['Poppins'])
        lines, cur = [], ''
        for wd in t.split(' '):                       # long titles wrap (the checker reads every word), never truncate
            if cur and fnt.text_length(cur + ' ' + wd, 10) > W - 1.85 * inch:
                lines.append(cur); cur = wd
            else:
                cur = (cur + ' ' + wd).strip()
        lines.append(cur)
        pg.insert_text((0.6 * inch, y), f'p.{CLASS_PAGES[aid]}', fontsize=10, fontname='PopSB', fontfile=mp.FONT_FILES['Poppins-SemiBold'], color=(0.18, 0.25, 0.32))
        for j, ln in enumerate(lines):
            pg.insert_text((1.15 * inch, y + j * 13), ln, fontsize=10, fontname='Pop', fontfile=mp.FONT_FILES['Poppins'], color=(0.08, 0.19, 0.24))
        y += 13 * (len(lines) - 1)
        y += 16.5
    tmp = path + '.tmp'
    doc.save(tmp, garbage=3, deflate=True, no_new_id=True); doc.close(); os.replace(tmp, path)
    B.finish(path)
    return path


# ---------------------------------------------------------------- E7: one supply list (unit-1-supplies.json)
KIND_ORDER = ['printable', 'puppet', 'book', 'food', 'made', 'special', 'basic']


def supply_hits(man, line):
    return [e for e in man['supplies']['items'] if any(re.search(p, line.lower()) for p in e['match'])]


def supplies_for(man, recs_by_day):
    """[(day_no, recs)] -> one entry per catalog item: {'e', 'uses': [(day, block label)], 'lines': [material lines]}, kind then catalog order."""
    found, order = {}, [e['id'] for e in man['supplies']['items']]
    for n, recs in recs_by_day:
        for r in recs:
            for m in r['materials']:
                hits = supply_hits(man, m)
                if not hits:
                    raise SystemExit(f'{r["id"]}: material "{m}" is not in unit-1-supplies.json')
                for e in hits:
                    x = found.setdefault(e['id'], {'e': e, 'uses': [], 'lines': []})
                    if (n, LABEL[r['block']]) not in x['uses']:
                        x['uses'].append((n, LABEL[r['block']]))
                    if m not in x['lines']:
                        x['lines'].append(m)
    return sorted(found.values(), key=lambda x: (KIND_ORDER.index(x['e']['kind']), order.index(x['e']['id'])))


def supply_text(x):
    """(where it comes from / the ordinary-supplies option, setup and supervision) for one deduplicated item"""
    e = x['e']
    src = {'book': 'From your own shelf or library. ', 'food': 'From the kitchen. ', 'made': '', 'basic': 'Ordinary classroom supply. ',
           'special': 'If you do not have it: '}.get(e['kind'], '')
    where = src + (e.get('ordinary') or '') + ((' ' + e['note']) if e.get('note') else '')
    care = ' '.join(t for t in (e.get('setup'), e.get('supervision')) if t)
    return where.strip(), care


# where a referenced thing is: the stand-alone packet points to files and pages; the Start Monday bundle points inside itself
class Loc:
    def __init__(self, man, cls_pages, bundle=None):
        self.man, self.cls, self.b = man, cls_pages, bundle      # bundle: {'asset': {ref: page}, 'story': {slug: page}, 'pt': {day: page}, 'kitchen', 'family', 'prep'}

    def asset(self, ref):
        a = self.man['assets'][ref]
        if self.b is None:
            return f'classroom printables p.{self.cls[ref]}' if ref in self.cls else a['location'].split(': ', 1)[-1]
        if ref in self.b['asset']:
            return f'this bundle p.{self.b["asset"][ref]}'
        if ref.startswith('print:lib-'):
            return 'your own shelf or library (any title on the topic)'
        if ref.startswith(('print:cookbook-', 'print:recipe-')):
            return f'the kitchen page, this bundle p.{self.b["kitchen"]}'
        if ref == 'print:u1-family-cards':
            return f'this bundle p.{self.b["family"]}'
        raise SystemExit(f'bundle: no page for {ref}')

    def story(self, slug, what):
        if self.b is None:
            return f'the {what} in the story set u1-story-{slug}.pdf'
        return f'the {what} in this bundle, p.{self.b["story"][slug]}'


def print_list(man, n, recs, sup, loc):
    """every printable the day uses (media items plus the supply catalog's printables), once each, with where it is"""
    A, out, seen = man['assets'], [], set()
    refs = [m['ref'] for r in recs for m in r['media'] if m['status'] != 'unavailable']
    refs += [x['e']['asset'] for x in sup if x['e']['kind'] in ('printable', 'puppet') and x['e'].get('asset')]
    for ref in refs:
        if ref in seen or ref == f'print:u1-d{n:02d}-packet' or ref.endswith('-picture-talk'):
            continue
        seen.add(ref)
        a = A[ref]
        out.append(f'{a["title"]} ({STATUS_WORD[a["status"]].lower()}): {loc.asset(ref) if not re.match(r"print:u1-(readaloud|cue)-", ref) else loc.story(story_slug(ref), "story set pages")}')
    return out


def story_slug(ref):
    return re.sub(r'^print:(u1-readaloud-|u1-cue-|book-)', '', ref)


def supply_table(sup, col, week=False):
    rows = [[para('Supply', 'th'), para('Days' if week else 'Used in', 'th'), para('Where it comes from, or the ordinary-supplies option', 'th'), para('Setup and supervision', 'th')]]
    for x in sup:
        if x['e']['kind'] in ('printable', 'puppet'):
            continue
        where, care = supply_text(x)
        uses = '; '.join(sorted({f'Day {d}' for d, _ in x['uses']}, key=lambda s: int(s[4:]))) if week else ', '.join(b for _, b in x['uses'])
        rows.append([[para(esc(x['e']['name']), 'cellb'), para('Plan says: ' + esc('; '.join(x['lines'])), 'small')], para(esc(uses), 'cell'), para(esc(where), 'cell'), para(esc(care), 'cell')])
    return grid(rows, [1.85 * inch, 1.05 * inch, 2.45 * inch, 1.95 * inch], col)


def support_box(r):
    """leverage 3: the four whole-child fields, same order, same place (right after "Say or ask") on every block"""
    fc = r['family_connection']
    return boxed([para('<b>Everyone can join</b> <font color="#5B6E77">(the same four lines on every block)</font>', 'cell'),
                  para('<b>Participation choices:</b> ' + esc(' '.join(r['participation_alternatives'])), 'cell'),
                  para('<b>Movement alternative:</b> ' + esc(r['movement_alternative']), 'cell'),
                  para('<b>Meal reference:</b> ' + esc(r['meal_reference'] or 'No food in this block.'), 'cell'),
                  para(f'<b>Family connection:</b> {esc(fc["note"])} <font color="#5B6E77">(activity {esc(fc["activity"])})</font>', 'cell')],
                 C['lumi'], TINT['lumi'], 5)


# ---------------------------------------------------------------- day teacher packets (platypus)
def zone_rows(rec):
    def split(txt):
        out, names = {}, [n for n in ZONE_NAMES if n in txt]
        for i, n in enumerate(names):
            a = txt.index(n) + len(n) + 1
            b = txt.index(names[i + 1]) if i + 1 < len(names) else len(txt)
            out[n] = txt[a:b].strip().rstrip('.').strip()
        return out
    t2, t3 = split(rec['age_adaptations']['twos']), split(rec['age_adaptations']['threes'])
    intro = rec['age_adaptations']['threes'].split(ZONE_NAMES[0])[0].strip()
    return intro, [(n, t2.get(n, ''), t3.get(n, '')) for n in ZONE_NAMES if n in t3]


def songs_for(man, recs):
    text = json.dumps(recs)
    keys = [('Come-to-the-Carpet', 'Bop Come-to-the-Carpet Song'), ('reeting song', 'Greeting song'), ('leanup Song', 'Bop Cleanup Song'), ('leanup song', 'Bop Cleanup Song'),
            ('Pick it up, put it back', 'Clean Up, Team! chant (original, no tune)'), ('Brave Learner chant', 'Brave Learner chant'), ('Ma-ya', 'Name chant'),
            ('turn the page, turn the page', 'Turn the page'), ('reading place', 'Friend Match'), ('how are you', 'Hello ball song'), ('My turn, your turn, now', 'My turn, your turn'),
            ('reach up high', 'Bop cheer'), ('One arm in', 'Coat song'), ('Learn! Belong! Explore! Move!', 'Pillar chant')]
    names = ['Bop Come-to-the-Carpet Song', 'Greeting song', 'Bop Cleanup Song', 'Bop Handwashing Song']
    for k, n in keys:
        if k in text and n not in names:
            names.append(n)
    by = {s['name']: s for s in man['songs']}
    return [by[n] for n in names]


def day_packet(man, day, recs, cls_pages, prep=None, loc=None, path=None, week_sup=None):
    n = day['day']; wk = man['weeks'][day['week'] - 1]; lead = wk['lead']
    loc = loc or Loc(man, cls_pages)
    bundle = loc.b is not None
    path = path or os.path.join(PP.FILES, day['packet'])
    opener = {'band': 2.6 * inch, 'kicker': ['Unit 1', f'Week {day["week"]}: {wk["theme"]}', day['weekday'], 'Teacher packet'], 'big': f'Day {n}',
              'title': day['title'], 'cast': [B.POSE[lead]['opener']], 'cast_h': 2.3 * inch / B.scale(B.POSE[lead]['opener'])}
    doc = Doc(path, f'Day {n}: {day["title"]}', f'Unit 1 · Week {day["week"]}: {wk["theme"]} · {day["weekday"]} · Teacher packet',
              f'Futures Friends · Unit 1 · Day {n} teacher packet · Draft, not reviewed · Minutes are estimates · © 2026 Futures Friends', f'Unit 1 Day {n} teacher packet (draft)',
              friend=lead, week=day['week'], opener=opener)
    A = man['assets']; col = C[lead]
    s = []
    # --- at a glance
    intro = [para(f'<b>Lead friend:</b> {NAME[lead]} ({" + ".join(wk["pillars"])}) · <b>Zone of the week:</b> {esc(wk["zone"])} · <b>Color of the week:</b> {esc(wk["color"])}', 'body'),
             Spacer(1, 4),
             para('<b>No screen, app or internet needed.</b> ' + ('The episode slot is a picture-talk story told with the friend puppets (page in this packet). '
                  if any(r['block'] == 'picture-talk' for r in recs) else 'Friday is Friends Live: the teacher retells the week\'s stories with the puppets. ')
                  + 'Teacher lines are suggestions: say them in your own words. Minutes are estimates from the plan, not timed yet.', 'body')]
    s.append(GuideNote('teacher', [p for p in intro if isinstance(p, Paragraph)], friend=lead))
    s.append(Spacer(1, 10))
    s.append(sect('The day at a glance', 'routine', lead))
    rows = [['', para('Block', 'th'), para('What happens', 'th'), para('Minutes (est.)', 'th'), para('Friend', 'th')]]
    for r in recs:
        name = re.search(r'\(([^)]+)\)$', r['sources'][0])
        what = (name.group(1) + ': ' if name and r['block'] in ('activity', 'outside', 'move') else '') + r['objective']
        rows.append([IconBadge(B.BLOCK_ICON.get(r['block'], 'star'), r['character'], 0.24 * inch), para(LABEL[r['block']], 'cellb'), para(esc(what), 'cell'),
                     para('during the meal' if r['duration_min_estimate'] is None else f'about {r["duration_min_estimate"]}', 'cell'),
                     para(f'<font color="{tone(r["character"])["deep"]}"><b>{NAME[r["character"]]}</b></font>', 'cell')])
    tot = sum(r['duration_min_estimate'] or 0 for r in recs)
    rows.append(['', para('<b>Total</b>', 'cell'), para('Planned teaching blocks (meals, rest and outdoor play run on the daily schedule)', 'cell'), para(f'<b>about {tot}</b>', 'cell'), ''])
    s.append(grid(rows, [0.36 * inch, 1.3 * inch, 3.9 * inch, 0.95 * inch, 0.73 * inch], col))
    s.append(Spacer(1, 8))
    # --- before you start: ONE deduplicated supply list (E7), then everything to print, each once
    sup = supplies_for(man, [(n, recs)])
    prints = print_list(man, n, recs, sup, loc)
    gone = []
    for r in recs:
        for m in r['media']:
            a = A[m['ref']]
            if m['status'] == 'unavailable':
                rep = {'video': 'the picture-talk page in this packet', 'puppet': 'the friend stick puppets (%s)' % loc.asset('puppet:u1-stick-puppets')}.get(m['type'])
                if m['ref'].startswith('print:book-') or m['ref'].startswith('print:u1-readaloud-'):
                    slug = story_slug(m['ref'])
                    rep = loc.story(slug, 'read-aloud spread' if A.get('print:u1-readaloud-' + slug, {}).get('status') != 'unavailable' else 'cue card')
                item = f'{a["title"]}. Use instead: {rep}'
                if item not in gone:
                    gone.append(item)
    if bundle:
        s += [boxed([para(f'<b>Before you start:</b> the supply list (one list, no repeats), everything to print and the prep-ahead list are on the prep list '
                          f'at the front of this bundle, p.{loc.b["prep"]}. Every printable page this day names is in this bundle.', 'cell')], col, None, 6)]
    else:
        s += [CondPageBreak(1.6 * inch), sect('Supplies for today: one list, no repeats', 'supplies', lead, 'setup'),
              para('Each supply once, with the blocks that use it. Special items have an ordinary-supplies option; equipment has setup and supervision notes. '
                   'Printables are in the next list. (Draft, not reviewed.)', 'small'), Spacer(1, 3), supply_table(sup, col), Spacer(1, 6)]
        s += [CondPageBreak(1.3 * inch), sect('Print or pull out', 'print', lead), Spacer(1, 3), checklist(prints, col)]
    if gone:
        s.append(Spacer(1, 6))
        s.append(KeepTogether([sect('Not produced yet, and what replaces it', 'friends-live', lead), Spacer(1, 3)] + [para('• ' + esc(g), 'cell') for g in gone]))
    if prep and not bundle:
        s.append(Spacer(1, 6))
        prows = [[para('Make, collect or keep', 'th'), para('From', 'th'), para('Used on', 'th'), para('What to do', 'th')]]
        for x in prep:
            prows.append([para(esc(x['item']), 'cellb'), para(esc(days_text(x['from'])), 'cell'), para(esc(days_text(x['for'])), 'cell'), para(esc(x['do']), 'cell')])
        s.append(KeepTogether([sect('Prep ahead this week', 'supplies', lead, 'setup'),
                               para('Later blocks this week (mostly Friday) use things made, collected or kept on earlier days. A substitute cannot make them on the day: '
                                    'keep each one when it is made. (Draft, not reviewed.)', 'small'), Spacer(1, 3),
                               grid(prows, [1.55 * inch, 1.5 * inch, 1.35 * inch, 2.9 * inch], col)]))
    if week_sup and not bundle:
        s += [Spacer(1, 6), CondPageBreak(1.6 * inch), sect(f'This week\'s supplies (Days {(day["week"] - 1) * 5 + 1} to {day["week"] * 5}): one list for the week', 'supplies', lead),
              para('Gather once on Monday. The same item on several days is listed once.', 'small'), Spacer(1, 3), supply_table(week_sup, col, week=True)]
    s.append(Spacer(1, 6))
    obs = [sect('Observation focus this week (2 to 3 short, factual notes on about 4 children today)', 'observe', lead)] + [para('• ' + esc(o), 'cell') for o in wk['observe']]
    s.append(KeepTogether(obs))
    s.append(Spacer(1, 6))
    s.append(KeepTogether([sect('Daily routines used in this plan', 'routine', lead, 'routines')] + [para(f'<b>{esc(x["name"])}:</b> {esc(x["how"])}', 'cell') for x in man['routines']]))
    if n == 1 and not bundle:
        s.append(Spacer(1, 6))
        s.append(KeepTogether([sect('Before Day 1: preparation checklist', 'check', lead, 'setup'), Spacer(1, 3), checklist(man['prep_checklist'], col)]))
    # --- blocks
    for r in recs:
        b = r['block']; k = r['character']; fc = C[k]
        name = re.search(r'\(([^)]+)\)$', r['sources'][0])
        title = LABEL[b] + (f': {name.group(1)}' if name else '')
        mins = 'runs during the meal' if r['duration_min_estimate'] is None else f'about {r["duration_min_estimate"]} min (estimate)'
        head = BlockHead(B.BLOCK_ICON.get(b, 'star'), title, f'{mins} · {NAME[k]} · {" + ".join(r["pillars"])}', k, W - 1.26 * inch)
        body = [para(f'<b>Goal:</b> {esc(r["objective"])}')]
        ad = r['age_adaptations']
        if b == 'zones':
            intro, zr = zone_rows(r)
            body.append(para(esc(intro)))
            zrows = [[para('Zone', 'th'), para('Twos', 'th'), para('Threes and Pre-K', 'th')]] + [[para(esc(z), 'cellb'), para(esc(a), 'cell'), para(esc(c3), 'cell')] for z, a, c3 in zr]
            body.append(grid(zrows, [1.55 * inch, 2.55 * inch, 3.2 * inch], fc))
        else:
            if ad['threes'] == ad['prek']:
                body.append(para(f'<b>Threes and Pre-K:</b> {esc(ad["threes"])}'))
            else:
                body.append(para(f'<b>Threes:</b> {esc(ad["threes"])}')); body.append(para(f'<b>Pre-K:</b> {esc(ad["prek"])}'))
            body.append(para(f'<b>Twos:</b> {esc(ad["twos"])}'))
        if r['prompts']:
            body.append(para('<b>Say or ask</b>', 'body'))
            body += [para('• ' + esc(p), 'say') for p in r['prompts']]
        body.append(support_box(r))
        if r['materials']:
            body.append(para('<b>Materials:</b> ' + esc('; '.join(r['materials'])) + ' <font color="#5B6E77">(gathered once in the supply list)</font>', 'cell'))
        if r['kitchen_prompt']:
            body.append(boxed([para('<b>For the cook and the table (optional, neutral):</b> ' + esc(r['kitchen_prompt']), 'cell')], C['zuri'], TINT['zuri'], 5))
        if r['home_continuation']:
            h = r['home_continuation']
            body.append(boxed([para(f'<b>Take-home card: {esc(h["title"])}</b>', 'cell')] + [para(esc(x), 'cell') for x in h['steps']]
                              + [para('<b>From home:</b> ' + esc('; '.join(h['materials_from_home']) or 'nothing extra'), 'cell')], C['gold'], TINT['gold'], 5))
        s.append(CondPageBreak(1.6 * inch))
        s.append(Spacer(1, 8)); s.append(head); s.append(Spacer(1, 4))
        s += [x for f in body for x in (f, Spacer(1, 3))]
    # --- songs today
    sg = songs_for(man, recs)
    if sg:
        s.append(CondPageBreak(2.2 * inch)); s.append(Spacer(1, 8)); s.append(sect('Songs and chants for today (sing them; no recording needed)', 'song', 'bop'))
        for x in sg:
            s.append(KeepTogether([para(f'<b>{esc(x["name"])}</b> <font color="#5B6E77">(tune: {esc(x["tune"])})</font>', 'cell'), para(esc(x['words']), 'cell'), Spacer(1, 4)]))
    # --- picture-talk page
    pt = man['picture_talk'].get(f'{n:02d}')
    if pt:
        s.append(PageBreak())
        s += picture_talk_page(man, n, recs, pt, lead, col)
    # --- timing sheet
    s.append(PageBreak())
    s.append(sect('Rehearsal timing sheet', 'timing', lead, 'routines'))
    s.append(para('For the owner\'s rehearsal with a substitute' + ('' if bundle else ' (docs/program/UNIT1_REHEARSAL_SCRIPT.md)') + '. The observer writes the clock time at the start and end of each block and anything the substitute had to ask about or make up. No child names on this sheet.', 'body'))
    s.append(Spacer(1, 6))
    s.append(para('Date: ____________   Room and ages present: ______________________   Number of children: ______   Adults in the room: ______', 'cell'))
    s.append(Spacer(1, 8))
    trows = [[para('Block', 'th'), para('Plan (est.)', 'th'), para('Start', 'th'), para('End', 'th'), para('Actual min', 'th'), para('Had to ask or invent', 'th')]]
    for r in recs:
        trows.append([para(LABEL[r['block']], 'cell'), para('meal' if r['duration_min_estimate'] is None else f'{r["duration_min_estimate"]} min', 'cell'), '', '', '', ''])
    t = grid(trows, [1.5 * inch, 0.85 * inch, 0.7 * inch, 0.7 * inch, 0.8 * inch, 2.75 * inch], col, zebra=False)
    t.setStyle(TableStyle([('ROWBACKGROUNDS', (0, 1), (-1, -1), [white]), ('TOPPADDING', (0, 1), (-1, -1), 9), ('BOTTOMPADDING', (0, 1), (-1, -1), 9)]))
    s.append(t)
    s.append(Spacer(1, 8))
    s.append(para('After the day: Could the substitute run every block from this packet alone? Which materials were missing? Which instruction was unclear? Did any block need a screen or the internet? (It should not.)', 'cell'))
    doc.build(s)
    return path


class BeatCard(Flowable):
    """one picture-talk beat: a cream-felt story card, the beat number on a felt disc, the friends on felt grass, the line to say"""
    def __init__(self, n, text, keys, w, h):
        super().__init__(); self.n, self.text, self.keys, self.w, self.h = n, text, keys, w, h
    def wrap(self, aw, ah):
        return self.w, self.h
    def draw(self):
        c, k = self.canv, self.keys[0]
        B.felt(c, 0, 0, self.w, self.h, '#F6EEDD', r=14, stitch=False, grain=5)
        B.stitch_rect(c, 5, 5, self.w - 10, self.h - 10, 10, tone(k)['felt'], .9, alpha=1)
        c.setFillColor(HexColor(tone(k)['felt'])); c.circle(0.38 * inch, self.h - 0.38 * inch, 0.21 * inch, stroke=0, fill=1)
        B.stitch_rect(c, 0.38 * inch - 0.17 * inch, self.h - 0.38 * inch - 0.17 * inch, 0.34 * inch, 0.34 * inch, 0.17 * inch, '#FFFFFF', .7)
        c.setFillColor(white); c.setFont('Fredoka-Bold', 15); c.drawCentredString(0.38 * inch, self.h - 0.38 * inch - 5.2, str(self.n))
        p = Paragraph(esc(self.text), ST['big']); _, ph = p.wrap(self.w - 0.4 * inch, 400)
        p.drawOn(c, 0.2 * inch, self.h - 0.68 * inch - ph + 0.1 * inch)
        base = 0.3 * inch
        unit = min(1.42 * inch / max(B.scale(x) for x in self.keys), (self.h - ph - 1.0 * inch) / max(B.scale(x) for x in self.keys))
        B.cast_row(c, self.keys, self.w / 2, base, unit, gap=4, grass_pad=16)


def picture_talk_page(man, n, recs, pt, lead, col):
    s = [para(f'Picture-talk story: “{esc(pt["episode"])}”', 'h1'),
         para(f'Day {n}. The episode is not produced. Tell the same story with the stick puppets (or plush) and real objects, about {pt["episode_minutes"]} minutes. '
              'Hold up the right friend for each beat, act it out, and pause so children can guess what happens next.', 'body'),
         Spacer(1, 6)]
    cw = (W - 1.26 * inch) / 2 - 5
    cards = []
    for i, bt in enumerate(pt['beats']):
        ks = sorted([(bt.find(NAME[x]), x) for x in KEYS if NAME[x] in bt])[:2]
        ks = [x for _, x in ks] or [lead]
        cards.append(BeatCard(i + 1, bt, ks, cw, 3.15 * inch))
    g = Table([cards[0:2], cards[2:4]], colWidths=[cw + 5, cw + 5], rowHeights=[3.3 * inch, 3.3 * inch])
    g.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                           ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    s.append(g)
    rec = next(r for r in recs if r['block'] == 'picture-talk')
    s.append(Spacer(1, 6)); s.append(para('<b>Then ask</b>', 'body'))
    s += [para('• ' + esc(p), 'say') for p in rec['prompts'][1:]]
    return s


# ---------------------------------------------------------------- story sets
class Family(Flowable):
    """a friend and their grown-up on one ground line (one height unit), labelled: story-world characters"""
    def __init__(self, k, w, h, label=True):
        super().__init__(); self.k, self.w, self.h, self.label = k, w, h, label
    def wrap(self, aw, ah):
        return self.w, self.h
    def draw(self):
        c = self.canv
        slugs = [B.PARENT[self.k], B.POSE[self.k]['kind' if self.k == 'lumi' else 'stand']]
        unit = (self.h - 10) / max(B.scale(x) for x in slugs)
        x0, x1 = B.cast_row(c, slugs, self.w / 2, 8, unit, gap=2, grass_pad=18)
        if self.label:
            B.story_label(c, x1 + 22, 10, f'{B.name_of(slugs[0])} and {NAME[self.k]}: story-world characters')


def story_set(man, slug, site_books):
    st = man['stories'][slug]; k = st['friend'] if st['friend'] in KEYS else 'gold'
    path = os.path.join(OUT, f'u1-story-{slug}.pdf')
    who = KEYS if st['friend'] == 'all' else [st['friend']]
    band_friend = 'navy' if st['friend'] == 'all' else k
    cast = [B.POSE[x]['opener'] for x in who]
    opener = {'band': 2.45 * inch, 'kicker': ['Unit 1', 'Story set', 'Draft, not reviewed'], 'big': st['title'], 'cast': cast,
              'cast_h': (1.55 if len(who) > 1 else 2.25) * inch / max(B.scale(x) for x in cast)}
    doc = Doc(path, st['title'], 'Unit 1 story set: cue card, move or calm choice, read-aloud and family page',
              f'Futures Friends · Unit 1 story set · {st["title"]} · Draft, not reviewed · © 2026 Futures Friends', f'Unit 1 story set: {st["title"]} (draft)',
              friend=band_friend, opener=opener)
    col, tint = C[k], TINT[k]
    s = []
    s.append(sect('Teacher cue card', 'story', band_friend, 'teacher'))
    s.append(Spacer(1, 4))
    s.append(boxed([para('<b>The problem</b>', 'h3'), para(esc(st['problem']), 'big')], col, tint))
    s.append(Spacer(1, 6))
    s.append(boxed([para('<b>Say it together</b>', 'h3'), para(f'<font color="{hexof(col)}" size="20">{esc(st["line"])}</font>', 'big'), Spacer(1, 6), para(esc(st['gesture']), 'body')], col))
    s.append(Spacer(1, 6))
    s.append(boxed([para('<b>How it gets solved</b>', 'h3'), para(esc(st['resolution']), 'body'), Spacer(1, 4), para('<b>Hands-on in the room:</b> ' + esc(st['hands_on']), 'body')], col))
    if not st['read_aloud_available']:
        s.append(Spacer(1, 6))
        s.append(boxed([para('<b>Tell it from these beats.</b> The printed book is not produced and its words are being revised, so tell the story in your own words with the puppets.', 'body')]
                       + [para(f'{i + 1}. {esc(b)}', 'body') for i, b in enumerate(st['beats'])], C['gold'], TINT['gold']))
    s.append(PageBreak())
    s.append(sect('Move or calm: let each child choose', 'join', band_friend))
    s.append(para('Offer both after the story. Neither is a reward or a consequence.', 'body'))
    s.append(Spacer(1, 8))
    cw = (W - 1.2 * inch) / 2 - 4
    pair = Table([[[para(f'<font color="{hexof(C["bop"])}">Move</font>', 'h1'), Spacer(1, 6), para(esc(st['move']), 'big'), Spacer(1, 14), Pic(char('bop-dancing', 2.5 * inch), 2.5 * inch, 'CENTER', ground=True)],
                   [para(f'<font color="{hexof(C["lumi"])}">Calm</font>', 'h1'), Spacer(1, 6), para(esc(st['calm']), 'big'), Spacer(1, 14), Pic(char('lumi-calm-breath', 2.5 * inch), 2.5 * inch, 'CENTER', ground=True)]]],
                 colWidths=[cw, cw], rowHeights=[6.6 * inch])
    pair.setStyle(TableStyle([('BOX', (0, 0), (0, 0), 1.2, C['bop'], 1, (3, 2.2)), ('BOX', (1, 0), (1, 0), 1.2, C['lumi'], 1, (3, 2.2)), ('BACKGROUND', (0, 0), (0, 0), TINT['bop']),
                              ('BACKGROUND', (1, 0), (1, 0), TINT['lumi']), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 14), ('RIGHTPADDING', (0, 0), (-1, -1), 14), ('TOPPADDING', (0, 0), (-1, -1), 12)]))
    s.append(pair)
    s.append(PageBreak())
    b = site_books.get(slug)
    if st['read_aloud_available'] and b and b.get('spreads'):
        s.append(sect('Read-aloud script', 'story', band_friend))
        s.append(para('Words as published on the Futures Friends Story Time page (Storybook Series v1.0 manuscript). The illustrations are not finished: '
                      'the grey line says what the picture will show. Show the puppet or point to a real object instead. Ask one question per page, not all of them.', 'body'))
        s.append(Spacer(1, 6))
        for i, sp in enumerate(b['spreads']):
            bits = [para(f'<font color="{hexof(col)}"><b>{i + 1}</b></font>  ' + esc(sp['p']), 'big'), para('Picture: ' + esc(sp['pic']), 'small')]
            if sp.get('q'):
                bits.append(para('<b>Ask:</b> ' + esc(sp['q'][1]), 'say'))
            if sp.get('b'):
                bits.append(para('<b>Move or feel:</b> ' + esc(sp['b']), 'cell'))
            s.append(KeepTogether(bits + [Spacer(1, 9)]))
        s.append(PageBreak())
    s.append(sect('For families: keep the story going at home', 'home', band_friend))
    if st['friend'] in KEYS:
        s.append(Spacer(1, 4)); s.append(Family(k, W - 1.26 * inch, 1.9 * inch)); s.append(Spacer(1, 6))
    s.append(boxed([para(esc(st['family']), 'big')], col, tint))
    a = (b or {}).get('act')
    if a:
        s.append(Spacer(1, 8))
        s.append(para(f'Try it together: {esc(a["t"])} (about {a["min"]} minutes)', 'h2'))
        s.append(para('<b>You need:</b> ' + esc('; '.join(a['mat'])), 'body'))
        s += [para(f'{i + 1}. {esc(x)}', 'body') for i, x in enumerate(a['steps'])]
        s.append(Spacer(1, 4)); s.append(para('<b>Make it easier or harder:</b> ' + esc(a['adapt']), 'body'))
    s.append(Spacer(1, 8))
    s.append(para('Optional. A few minutes is plenty. Talk, play and try: there is nothing to hand back.', 'small'))
    s.append(Spacer(1, 10))
    s.append(para('Source: ' + esc(re.sub(r'Futures_Friends_\d+_(\w+?)\.pdf', lambda m: 'Futures Friends ' + m.group(1).replace('_', ' '), st['source'])), 'small'))
    doc.build(s)
    return path


# ---------------------------------------------------------------- family take-home cards (canvas, two per page)
def family_cards(man, days, path=None, pick=None, title='Unit 1 family take-home cards', subject='Futures Friends Unit 1 family take-home cards, Days 1 to 20 (draft)'):
    """two cards per page; pick = day indices (0-based, repeats allowed: the bundle prints two copies of its day's card)"""
    path = path or os.path.join(OUT, 'u1-family-take-home-cards.pdf')
    c = mp.canvas.Canvas(path, pagesize=letter, invariant=1)
    c.setTitle(title); c.setAuthor('Futures Friends'); c.setSubject(subject); c.setCreator('tools/make-unit1-packets.py')
    sel = [(man['days'][j], days[j]) for j in (pick if pick is not None else range(len(days)))]
    for i, (d, recs) in enumerate(sel):
        g = next(r for r in recs if r['block'] == 'goodbye'); h = g['home_continuation']
        k = man['weeks'][d['week'] - 1]['lead']
        y0 = H / 2 if i % 2 == 0 else 0
        if i % 2 == 0 and i:
            c.showPage()
        cx0, cy0, cw, ch = 0.3 * inch, y0 + 0.2 * inch, W - 0.6 * inch, H / 2 - 0.4 * inch
        F = B.FRIEND[k]
        mp.cutline(c, cx0, cy0, cw, ch)
        band = 1.0 * inch                                   # story-world band: the week's friend in felt, the plush logo
        c.saveState(); B.round_clip(c, cx0 + 6, cy0 + ch - band - 6, cw - 12, band, 10)
        B.felt(c, cx0 + 6, cy0 + ch - band - 6, cw - 12, band, F['felt'], stitch=False)
        c.restoreState()
        B.stitch_rect(c, cx0 + 11, cy0 + ch - band - 1, cw - 22, band - 10, 7, F['thread'], .9)
        lr, (lw_, lh_) = B.logo('plush'); lh = 0.66 * inch
        c.drawImage(lr, cx0 + 0.24 * inch, cy0 + ch - band + 0.1 * inch, width=lh * lw_ / lh_, height=lh, mask='auto')
        tx = cx0 + 0.24 * inch + lh * lw_ / lh_ + 12
        c.setFillColor(white); c.setFont('Fredoka', B.fit_size(h['title'], 'Fredoka', 21, cx0 + cw - tx - 0.3 * inch, 13))
        c.drawString(tx, cy0 + ch - 0.5 * inch, h['title'])
        sub = f'Today at Futures: Day {d["day"]}, {d["title"]} · Unit 1 · activity {g["id"]}'
        c.setFont('Poppins', B.fit_size(sub, 'Poppins', 8.6, cx0 + cw - tx - 0.3 * inch, 6.5)); c.drawString(tx, cy0 + ch - 0.74 * inch, sub)
        # the friend and their grown-up (one height unit) on felt grass, labelled
        slugs = [B.PARENT[k], B.POSE[k]['kind' if k == 'lumi' else 'stand']]
        unit = min(2.7 * inch, (ch - band - 0.9 * inch) / max(B.scale(x) for x in slugs))
        fx = cx0 + cw - 1.3 * inch
        B.cast_row(c, slugs, fx, cy0 + 0.62 * inch, unit, gap=0, grass_pad=12)
        B.story_label(c, fx, cy0 + 0.3 * inch, f'{B.name_of(slugs[0])} and {NAME[k]}: story-world characters', align='center', size=6.2)
        y = cy0 + ch - band - 0.3 * inch
        for stp in h['steps']:
            lab, _, rest = stp.partition(': ')
            y -= mp.para(c, (f'<font name="Fredoka" color="{F["deep"]}" size="13">{esc(lab)}:</font> {esc(rest)}' if rest else esc(stp)),
                         0.6 * inch, y, W - 3.25 * inch, mp.style(11.2, lead=15.4)) + 9
        need = '; '.join(h['materials_from_home']) or 'Nothing extra.'
        B.draw_icon(c, 'goodbye', 0.6 * inch, y - 14, 12, HexColor(F['deep']), lw=2)
        text_in(c, 'You need: ' + need, 0.6 * inch + 17, y - 2, W - 3.4 * inch, 10, color=MUTED)
        c.setFillColor(MUTED); c.setFont('Poppins', 7.5)
        c.drawString(0.6 * inch, y0 + 0.38 * inch, 'Optional. A few minutes is plenty. Draft, not yet reviewed · © 2026 Futures Friends')
    c.showPage(); c.save()
    return path


# ---------------------------------------------------------------- E6 / leverage 1: the Start Monday bundle (ONE PDF per day)
BUNDLE_DIR = os.path.join(OUT, 'start-monday')
PT_REF = re.compile(r'Picture-talk cards? from Days? ([0-9, and]+)')
COLOR_SIDES = {'red': ['strawberr'], 'orange': ['mandarin', 'orange segments', 'cantaloupe', 'carrot'], 'green': ['kiwi', 'peas', 'green beans', 'broccoli', 'cucumber'],
               'yellow': ['banana', 'pineapple', 'corn'], 'purple': ['blueberr', 'grape']}


COPIES = {'puppet:u1-stick-puppets': '1 set (keep all unit)', 'print:u1-friend-posters': '1 set (keep all unit)', 'print:u1-zone-signs': '1 set (post once)',
          'print:u1-rainbow-bands': '1 set (post once)', 'print:u1-songs-card': '1', 'print:u1-feeling-faces': '1 set per small group', 'print:u1-book-helper-chart': '1',
          'print:u1-story-builders': '1 set per pair', 'print:u1-name-cards': '1 card per child', 'print:u1-achievement-charts': '1 chart; 1 card per child on Day 20',
          'print:u1-greeting-board': '1', 'print:u1-calm-board': '1 board; 1 Calm Plan card per child', 'print:u1-wonder-sheets': '1 per child',
          'print:u1-sink-float-chart': '1', 'print:u1-relay-labels': '1 set', 'print:u1-movement-cards': '1 set', 'print:u1-food-cards': '1 set per small group',
          'print:fah-lumi-calm-cards': '1 set', 'print:fah-bop-move-cards': '1 set', 'print:fah-rainbow-tracker': '1 per family'}


def site_recipes():
    js = "const fs=require('fs'),vm=require('vm');const c={window:{}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('data.js','utf8'),c);process.stdout.write(JSON.stringify(c.FF.recipes));"
    out = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return {r['code']: r for r in json.loads(out)}


def cls_ranges(total):
    starts = sorted(set(CLASS_PAGES.values()))
    return {ref: (p, next((x for x in starts if x > p), total + 1) - 1) for ref, p in CLASS_PAGES.items()}


def bundle_parts(man, n, recs):
    """what Day n's bundle carries: classroom assets (in printed order), site printables, story sets, earlier picture-talk days"""
    sup = supplies_for(man, [(n, recs)])
    refs = [m['ref'] for r in recs for m in r['media']] + [x['e']['asset'] for x in sup if x['e'].get('asset')]
    cls, fah, stories = [], [], []
    for ref in refs:
        if ref.startswith(('print:u1-readaloud-', 'print:u1-cue-', 'print:book-')):
            if story_slug(ref) not in stories:
                stories.append(story_slug(ref))
        elif ref == 'puppet:ff-plush-set' or ref in CLASS_PAGES:
            ref = 'puppet:u1-stick-puppets' if ref == 'puppet:ff-plush-set' else ref
            if ref not in cls:
                cls.append(ref)
        elif ref.startswith('print:fah-') and ref not in fah:
            fah.append(ref)
    cls.sort(key=lambda ref: CLASS_PAGES[ref])
    earlier = sorted({int(x) for r in recs for m in r['materials'] for g in PT_REF.findall(m) for x in re.findall(r'\d+', g)} - {n})
    return sup, cls, fah, stories, earlier


def prep_doc(man, d, recs, sup, loc, prep, week_sup, prints, path):
    n = d['day']; wk = man['weeks'][d['week'] - 1]; col = C[wk['lead']]
    doc = Doc(path, f'Day {n} prep list', f'Unit 1 · Day {n}: {d["title"]} · Start Monday bundle · gather, print, prep ahead',
              f'Futures Friends · Unit 1 · Day {n} Start Monday bundle · Draft, not reviewed · © 2026 Futures Friends', f'Unit 1 Day {n} prep list (draft)',
              friend=wk['lead'], week=d['week'], opener={'band': 1.85 * inch, 'kicker': ['Unit 1', f'Day {n}: {d["title"]}', 'Start Monday bundle'],
                                                          'big': 'Prep list', 'icon': 'supplies', 'cast': ['mr-moss'], 'cast_h': 1.75 * inch / B.scale('mr-moss')})
    s = [GuideNote('setup', [para('Gather and print everything on this page before the day starts. Every printable page the day names is inside this bundle; '
                                  'nothing needs a screen, an app, the internet or another file. Draft: not yet reviewed.', 'guide')], friend=wk['lead']), Spacer(1, 8)]
    if n == 1:      # inside the bundle, the checklist points inside the bundle
        here = [x.replace('(zone signs: classroom printables)', f'(zone signs: this bundle p.{loc.b["asset"]["print:u1-zone-signs"]})') for x in man['prep_checklist']]
        s += [KeepTogether([sect('Before Day 1: preparation checklist', 'check', wk['lead']), Spacer(1, 3), checklist(here, col)]), Spacer(1, 6)]
    rows = [[para('Print or copy', 'th'), para('In this bundle', 'th'), para('Copies', 'th')]]
    for title, a, b, copies in prints:
        rows.append([para(esc(title), 'cell'), para(f'p.{a}' if a == b else f'p.{a} to {b}', 'cell'), para(esc(copies), 'cell')])
    s += [KeepTogether([sect('Print or copy from this bundle', 'print', wk['lead']), Spacer(1, 3), grid(rows, [4.55 * inch, 1.2 * inch, 1.49 * inch], col)]), Spacer(1, 8)]
    shelf = [x for x in print_list(man, d['day'], recs, sup, loc) if 'your own shelf or library' in x]
    if shelf:
        s += [KeepTogether([sect('From your own shelf or library (not printed)', 'story', wk['lead']), Spacer(1, 3), checklist(shelf, col)]), Spacer(1, 8)]
    s += [sect('Supplies for today: one list, no repeats', 'supplies', wk['lead']),
          para('Each supply once, with the blocks that use it. Special items have an ordinary-supplies option; equipment has setup and supervision notes.', 'small'),
          Spacer(1, 3), supply_table(sup, col), Spacer(1, 8)]
    if prep:
        prows = [[para('Make, collect or keep', 'th'), para('From', 'th'), para('Used on', 'th'), para('What to do', 'th')]]
        for x in prep:
            prows.append([para(esc(x['item']), 'cellb'), para(esc(days_text(x['from'])), 'cell'), para(esc(days_text(x['for'])), 'cell'), para(esc(x['do']), 'cell')])
        s += [KeepTogether([sect('Prep ahead this week', 'supplies', wk['lead']),
                            para('Later blocks this week (mostly Friday) use things made, collected or kept on earlier days. A substitute cannot make them on the day: '
                                 'keep each one when it is made.', 'small'), Spacer(1, 3), grid(prows, [1.55 * inch, 1.5 * inch, 1.35 * inch, 2.9 * inch], col)]), Spacer(1, 8)]
    if week_sup:
        s += [CondPageBreak(1.6 * inch), sect(f'This week\'s supplies (Days {(d["week"] - 1) * 5 + 1} to {d["week"] * 5}): one list for the week', 'supplies', wk['lead']),
              para('Gather once on Monday. The same item on several days is listed once.', 'small'), Spacer(1, 3), supply_table(week_sup, col, week=True)]
    doc.build(s)
    return path


def kitchen_doc(man, d, recs, recipes, path):
    n = d['day']
    meal = next(r for r in recs if r['block'] == 'meal')
    doc = Doc(path, f'Day {n} for the cook', f'Unit 1 · Day {n}: {d["title"]} · Start Monday bundle · kitchen page',
              f'Futures Friends · Unit 1 · Day {n} Start Monday bundle · Draft, not reviewed · © 2026 Futures Friends', f'Unit 1 Day {n} kitchen page (draft)',
              friend='zuri', week=d['week'], opener={'band': 1.7 * inch, 'kicker': ['Unit 1', f'Day {n}: {d["title"]}', 'Kitchen page'], 'big': 'For the cook',
                                                     'icon': 'kitchen', 'cast': ['zuri-apple'], 'cast_h': 1.6 * inch / B.scale('zuri-apple')})
    txt = (meal['kitchen_prompt'] + ' ' + ' '.join(meal['materials'])).lower()
    ks = man['kitchen_reference']
    rows = [x for x in ks['sides'] if x['match'] in txt]
    if not rows:
        color = next((c for c in COLOR_SIDES if c in txt), None)
        rows = [x for x in ks['sides'] if color and x['match'] in COLOR_SIDES[color]]
    s = [boxed([para('<b>Meal reference:</b> ' + esc(meal['meal_reference']), 'cell')], C['zuri'], TINT['zuri'], 6), Spacer(1, 6),
         para('<b>Today at the table (optional, neutral):</b> ' + esc(meal['kitchen_prompt']), 'body'), Spacer(1, 8)]
    if rows:
        g = [[para('Food', 'th'), para('Group', 'th'), para('One unit (ages 3 to 5)', 'th'), para('Prep and safe cut', 'th')]]
        g += [[para(esc(x['item']), 'cellb'), para(esc(x['group']), 'cell'), para(esc(x['unit']), 'cell'), para(esc(x['prep']), 'cell')] for x in rows]
        s += [sect('Simple Sides and Staples: today\'s foods', 'meal', 'zuri'), para('From ' + esc(ks['source']) + '. Portions and crediting are checked by your kitchen.', 'small'),
              Spacer(1, 3), grid(g, [1.6 * inch, 0.9 * inch, 1.5 * inch, 3.3 * inch], C['zuri']), Spacer(1, 8)]
    if any(m['ref'] == 'print:cookbook-rainbow-tasting' for m in meal['media']):
        t = ks['tasting']
        s += [KeepTogether([para(esc(t['title']), 'h3'), para('From ' + esc(t['source']) + '.', 'small'), para('<b>You need:</b> ' + esc('; '.join(t['need'])), 'cell')]
                           + [para(f'{i + 1}. {esc(x)}', 'cell') for i, x in enumerate(t['steps'])] + [para(esc(t['avoid']), 'cell')]), Spacer(1, 8)]
    for m in meal['media']:
        if not m['ref'].startswith('print:recipe-'):
            continue
        r = recipes[m['ref'].split('-', 1)[1]]
        g = [[para('Ingredient', 'th'), para('10 children', 'th'), para('20 children', 'th'), para('40 children', 'th')]]
        g += [[para(esc(i[0]), 'cell')] + [para(esc(q), 'cell') for q in i[1:4]] for i in r['ing']]
        s += [CondPageBreak(2.5 * inch), para(f'Recipe card {esc(r["code"])}: {esc(r["name"])}', 'h3'),
              para(f'{esc(r["meal"])} · prep {esc(r.get("prep") or "")} · cook {esc(r.get("cook") or "")} · <b>Equipment:</b> {esc(r.get("equip") or "")}', 'small'), Spacer(1, 3),
              grid(g, [3.7 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch], C['zuri']), Spacer(1, 4)]
        s += [para(f'{i + 1}. {esc(x)}', 'cell') for i, x in enumerate(r['steps'])] + [Spacer(1, 8)]
    s.append(para('Every child is invited, never required, to look, smell, touch or taste. Serve only what each child\'s director-approved serving instruction allows.', 'small'))
    doc.build(s)
    return path


def cover_doc(man, d, toc, total, path):
    """the bundle's front cover: the day in felt with its lead friend, Ms. June's start-here note, then the contents"""
    n = d['day']; wk = man['weeks'][d['week'] - 1]; k = wk['lead']; F = B.FRIEND[k]
    c = mp.canvas.Canvas(path, pagesize=letter, invariant=1)
    c.setTitle(f'Start Monday: Unit 1 Day {n}'); c.setAuthor('Futures Friends'); c.setCreator('tools/make-unit1-packets.py')
    pose = B.POSE[k]['opener']
    B.opener_band(c, W, H, 3.7 * inch, k, ['Start Monday', 'Unit 1', f'Week {d["week"]}: {wk["theme"]}', d['weekday']], f'Day {n}', d['title'],
                  cast=[pose], cast_h=2.9 * inch / B.scale(pose), week=d['week'])
    c.setFillColor(white); c.setFont('Poppins-SemiBold', 9.5)
    c.drawString(0.55 * inch, H - 3.7 * inch + 0.42 * inch, 'One file for the whole day: print it and run the day.')
    # Ms. June's start-here note on cream felt
    y = H - 3.98 * inch
    body = [mp.Paragraph('<font name="Fredoka" size="16" color="#0A2B38">Start here</font>', mp.style(16, 'Fredoka', NAVY, lead=20)),
            mp.Paragraph(esc(f'Everything Day {n} needs is in this one file: the prep list, the teacher packet, every puppet and printable page the day names, '
                             f'the story pages, the kitchen page and the family card. Print it and run the day. No screen, app, internet or other file is needed.'), mp.style(9.8, lead=13.4)),
            mp.Paragraph('DRAFT: not yet reviewed by an early-childhood reviewer. Minutes are estimates until a rehearsal times a real day.', mp.style(8.8, 'Poppins-SemiBold', HexColor('#6E4C00'), lead=12))]
    note = GuideNote('teacher', body, W - 1.21 * inch, friend=k)
    _, nh = note.wrap(W - 1.21 * inch, 400)
    note.drawOn(c, 0.55 * inch, y - nh)
    y -= nh + 0.32 * inch
    c.setFillColor(NAVY); c.setFont('Fredoka', 15); c.drawString(0.55 * inch, y, f'In this bundle ({total} pages)')
    B.stitch_line(c, 0.55 * inch, y - 7, W - 0.66 * inch, y - 7, F['felt'], 1.1); y -= 24
    for title, a, b in toc:
        icon = ('supplies' if title.startswith('Prep list') else 'routine' if 'teacher packet' in title else 'kitchen' if title.startswith('For the cook')
                else 'home' if title.startswith('Family card') else 'story' if title.startswith('Story set') else 'picture-talk' if title.startswith('Picture-talk')
                else 'friends-live' if 'puppet' in title.lower() else 'print')
        B.draw_icon(c, icon, 0.55 * inch, y - 2.5, 11, HexColor(F['deep']), lw=2.1)
        c.setFillColor(HexColor(F['deep'])); c.setFont('Poppins-SemiBold', 9.6); c.drawString(0.55 * inch + 17, y, f'p.{a}' if a == b else f'p.{a} to {b}')
        c.setFillColor(INK); c.setFont('Poppins', 9.6)
        t = title
        while stringWidth(t, 'Poppins', 9.6) > W - 2.35 * inch and len(t) > 20:
            t = t[:-2]
        c.drawString(1.55 * inch, y, t if t == title else t.rstrip() + '...')
        c.setStrokeColor(HexColor('#EFE6D6')); c.setLineWidth(.4); c.line(0.55 * inch, y - 4.5, W - 0.66 * inch, y - 4.5)
        y -= 14.6
        if y < 0.8 * inch:
            raise SystemExit(f'Day {n}: the bundle contents do not fit on the cover')
    footer(c, 'Futures Friends · Unit 1 · Start Monday bundle · Draft, not reviewed · © 2026 Futures Friends. Print and copy for classroom use.', 1)
    c.showPage(); c.save()
    return path


def stamp(doc, n):
    """every page: 'Start Monday · Day n · Draft · bundle p. i of N' at the very bottom; a part's own 'Page k' becomes the bundle page
    (set in the brand's Poppins, never Helvetica)"""
    N = doc.page_count
    reg, semi = mp.FONT_FILES['Poppins'], mp.FONT_FILES['Poppins-SemiBold']
    freg, fsemi = fitz.Font(fontfile=reg), fitz.Font(fontfile=semi)
    for i, pg in enumerate(doc):
        for w in [w for w in pg.get_text('words') if w[4] == 'Page' and w[1] > pg.rect.height - 0.75 * 72]:
            num = next((v for v in pg.get_text('words') if v[1] == w[1] and v[0] > w[2] and re.fullmatch(r'\d+', v[4])), None)
            if num:
                r = fitz.Rect(w[0] - 1, w[1] - 1, num[2] + 1, num[3] + 1)
                pg.draw_rect(r, color=None, fill=(1, 1, 1))
                t = f'Bundle p. {i + 1}'
                pg.insert_text((r.x1 - fsemi.text_length(t, 7.2), w[3] - 1.8), t, fontsize=7.2, fontname='PopSB', fontfile=semi, color=(0.33, 0.4, 0.43))
        t = f'Start Monday · Day {n} · Draft, not reviewed · bundle p. {i + 1} of {N}'
        tw = freg.text_length(t, 6.8)
        x = (pg.rect.width - tw) / 2
        pg.draw_rect(fitz.Rect(x - 4, pg.rect.height - 0.27 * 72, x + tw + 4, pg.rect.height - 0.1 * 72), color=None, fill=(1, 1, 1))
        pg.insert_text((x, pg.rect.height - 0.15 * 72), t, fontsize=6.8, fontname='Pop', fontfile=reg, color=(0.04, 0.17, 0.22))


def start_monday(man, days, d, recs, prep, recipes, family_week):
    """one bundle; returns (path, pages, toc)"""
    n = d['day']
    os.makedirs(BUNDLE_DIR, exist_ok=True)
    tmp = os.path.join(BUNDLE_DIR, f'.parts-{n:02d}'); os.makedirs(tmp, exist_ok=True)
    A = man['assets']
    sup, cls, fah, stories, earlier = bundle_parts(man, n, recs)
    week_sup = supplies_for(man, [(x['day'], days[x['day'] - 1]) for x in man['days'] if x['week'] == d['week']]) if d['weekday'] == 'Monday' else None
    cls_pdf = os.path.join(OUT, 'u1-classroom-printables.pdf')
    rng = cls_ranges(pages(cls_pdf))
    # fixed parts: (key, title, src, first page index, last page index, copies)
    fixed = [(('asset', ref), A[ref]['title'], cls_pdf, rng[ref][0] - 1, rng[ref][1] - 1, COPIES.get(ref, '1 set')) for ref in cls]
    for ref in fah:
        f = os.path.join(ROOT, A[ref]['location'].split(': ', 1)[-1])
        fixed.append((('asset', ref), A[ref]['title'], f, 0, pages(f) - 1, COPIES.get(ref, '1 set')))
    for slug in stories:
        f = os.path.join(OUT, f'u1-story-{slug}.pdf')
        fixed.append((('story', slug), f'Story set: {man["stories"][slug]["title"]} (cue card, move or calm, read-aloud, family page)', f, 0, pages(f) - 1, '1 for the teacher'))
    for k in earlier:
        f = os.path.join(PP.FILES, man['days'][k - 1]['packet'])
        with fitz.open(f) as pd:
            idx = next(i for i, p in enumerate(pd) if 'Picture-talk story: “' in p.get_text())
        fixed.append((('pt', k), f'Picture-talk card from Day {k}: “{man["picture_talk"][f"{k:02d}"]["episode"]}”', f, idx, idx, '1 for the teacher'))
    fam = family_cards(man, days, os.path.join(tmp, 'family.pdf'), [n - 1, n - 1], f'Day {n} family card', f'Futures Friends Unit 1 Day {n} family card (draft)')
    fixed.append((('family', None), f'Family card: "{recs[-1]["home_continuation"]["title"]}" (two copies to a page)', fam, 0, 0, 'one per family'))
    counts = {'prep': 2, 'packet': 8, 'kitchen': 1}
    for attempt in range(5):
        layout, p = {}, 2
        for key in ('prep', 'packet'):
            layout[key] = (p, p + counts[key] - 1); p += counts[key]
        for f in fixed:
            layout[f[0]] = (p, p + f[4] - f[3]); p += f[4] - f[3] + 1
        layout['kitchen'] = (p, p + counts['kitchen'] - 1); p += counts['kitchen']
        total = p - 1
        b = {'asset': {k[1]: v[0] for k, v in layout.items() if isinstance(k, tuple) and k[0] == 'asset'},
             'story': {k[1]: v[0] for k, v in layout.items() if isinstance(k, tuple) and k[0] == 'story'},
             'pt': {k[1]: v[0] for k, v in layout.items() if isinstance(k, tuple) and k[0] == 'pt'},
             'kitchen': layout['kitchen'][0], 'family': layout[('family', None)][0], 'prep': layout['prep'][0]}
        loc = Loc(man, CLASS_PAGES, b)
        prints = [(t, layout[k][0], layout[k][1], cp) for k, t, _, _, _, cp in fixed]
        prints.insert(0, (f'Day {n} teacher packet: {d["title"]}', layout['packet'][0], layout['packet'][1], '1 for the teacher'))
        prints.append(('For the cook: today\'s foods, safe cuts' + (', the tasting steps' if any(m['ref'] == 'print:cookbook-rainbow-tasting' for r in recs for m in r['media']) else '')
                       + (' and the recipe cards' if any(m['ref'].startswith('print:recipe-') for r in recs for m in r['media']) else ''), layout['kitchen'][0], layout['kitchen'][1], '1 for the kitchen'))
        parts = {'prep': prep_doc(man, d, recs, sup, loc, prep, week_sup, prints, os.path.join(tmp, 'prep.pdf')),
                 'packet': day_packet(man, d, recs, CLASS_PAGES, None, loc, os.path.join(tmp, 'packet.pdf')),
                 'kitchen': kitchen_doc(man, d, recs, recipes, os.path.join(tmp, 'kitchen.pdf'))}
        got = {k: pages(v) for k, v in parts.items()}
        if got == counts:
            break
        counts = got
    else:
        raise SystemExit(f'Day {n}: bundle layout did not settle')
    toc = [('Prep list: print, gather and prep ahead', *layout['prep'])] + [(t, a, b2) for t, a, b2, _ in prints]
    cover = cover_doc(man, d, toc, total, os.path.join(tmp, 'cover.pdf'))
    out = fitz.open()
    for src, a, b2 in [(cover, 0, 0), (parts['prep'], 0, counts['prep'] - 1), (parts['packet'], 0, counts['packet'] - 1)] + [(f[2], f[3], f[4]) for f in fixed] + [(parts['kitchen'], 0, counts['kitchen'] - 1)]:
        with fitz.open(src) as s:
            out.insert_pdf(s, from_page=a, to_page=b2)
    assert out.page_count == total, (n, out.page_count, total)
    stamp(out, n)
    out.set_toc([[1, 'Start here: contents', 1]] + [[1, t, a] for t, a, _ in toc])
    out.set_metadata({'title': f'Start Monday: Unit 1 Day {n}, {d["title"]} (draft)', 'author': 'Futures Friends', 'subject': f'Futures Friends Unit 1 Day {n}: one file for the day (draft, not reviewed)',
                      'creator': 'tools/make-unit1-packets.py', 'producer': 'PyMuPDF', 'creationDate': 'D:20261005000000', 'modDate': 'D:20261005000000', 'keywords': 'draft'})
    path = os.path.join(BUNDLE_DIR, f'u1-day-{n:02d}-start-monday.pdf')
    out.save(path, garbage=4, deflate=True, no_new_id=True); out.close()
    B.finish(path)
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)
    return path, total, toc


# ---------------------------------------------------------------- previews and site data
def preview(path, name):
    os.makedirs(os.path.join(OUT, 'previews'), exist_ok=True)
    with fitz.open(path) as d:
        p = d[0]; z = 600 / p.rect.width
        pix = p.get_pixmap(matrix=fitz.Matrix(z, z), alpha=False)
        im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples); im.thumbnail((600, 600))
        dst = os.path.join(OUT, 'previews', name + '.png'); im.save(dst, optimize=True)
    return os.path.relpath(dst, PP.FILES)


def pages(path):
    with fitz.open(path) as d:
        return d.page_count


def compact_supplies(sup):
    """the deduplicated list for the web views: [name, kind, blocks, where it comes from / ordinary option, setup and supervision]"""
    out = []
    for x in sup:
        if x['e']['kind'] in ('printable', 'puppet'):
            continue
        where, care = supply_text(x)
        out.append([x['e']['name'], x['e']['kind'], [b for _, b in x['uses']], where, care])
    return out


def site_file(man, days, sha, files, sample, bundles):
    A = man['assets']
    def slim(r):
        return {'id': r['id'], 'block': r['block'], 'friend': r['character'], 'pillars': r['pillars'], 'goal': r['objective'], 'min': r['duration_min_estimate'],
                'media': [[m['ref'], m['status']] for m in r['media']],
                'part': r['participation_alternatives'], 'move': r['movement_alternative'], 'meal': r['meal_reference'], 'family': r['family_connection']}
    data = {
        'release': man['release'], 'version': man['version'], 'status': man['status'], 'title': man['title'], 'ages': man['ages'], 'length': man['length'],
        'approval': man['approval'], 'status_key': man['status_key'], 'duration_note': man['duration_note'], 'no_screen_rule': man['no_screen_rule'],
        'source_sha256': sha, 'supplies_sha256': man['supplies']['sha256'],
        'built_by': 'tools/make-unit1-packets.py from FFCRM hub/content/program (unit-1-release.json, unit-1/day-NN.json, unit-1-supplies.json)',
        'counts': {'days': len(days), 'activities': sum(len(d) for d in days), 'assets': man['asset_counts']},
        'weeks': [{k: w[k] for k in ('week', 'theme', 'lead', 'pillars', 'value', 'zone', 'color', 'celebration')} for w in man['weeks']],
        'days': [{'day': d['day'], 'week': d['week'], 'weekday': d['weekday'], 'title': d['title'], 'blocks': [slim(r) for r in recs],
                  'home': next(r['home_continuation'] for r in recs if r['block'] == 'goodbye'), 'packet': d['packet'],
                  'bundle': bundles[d['day']], 'supplies': compact_supplies(supplies_for(man, [(d['day'], recs)]))}
                 for d, recs in zip(man['days'], days)],
        'sample_days': sample, 'sample_seed': SEED,
        'detail': {str(d['day']): recs for d, recs in zip(man['days'], days) if d['day'] in sample},
        'picture_talk': {k: {'episode': v['episode'], 'beats': v['beats']} for k, v in man['picture_talk'].items()},
        'stories': {k: {'title': v['title'], 'friend': v['friend'], 'problem': v['problem'], 'line': v['line'], 'resolution': v['resolution'], 'read_aloud': v['read_aloud_available']} for k, v in man['stories'].items()},
        'assets': {k: [a['type'], a['title'], a['status'], a['location'], a['note']] for k, a in A.items()},
        'files': files,
    }
    js = ('/* Futures Friends Unit 1 release data for the #unit-1 page. GENERATED by tools/make-unit1-packets.py from the canonical records in the\n'
          '   FFCRM repo (hub/content/program); do not edit by hand. Full teacher wording is included only for the sample days. */\n'
          'window.FFUnit1Data = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(os.path.join(PP.DATA, 'unit1-data.js'), 'w').write(js)


# leverage 2 / E10: the family page (#this-week) reads only this small public file; the activity ids are the teacher plan's goodbye record ids
STORY_TIME = ('booker-tries-again', 'big-feelings-brighter-days', 'what-happens-if-we-try')


def family_file(man, days, sha, week_files):
    fa = man['family_activities']
    weeks = []
    for w in man['weeks']:
        acts = []
        for j, (d, recs) in enumerate([(d, recs) for d, recs in zip(man['days'], days) if d['week'] == w['week']]):
            g = next(r for r in recs if r['block'] == 'goodbye'); a = fa[g['id']]; h = g['home_continuation']
            st = a['story'] and man['stories'][a['story']]
            story = ({'title': st['title'], 'href': f'#story-time/{a["story"]}' if a['story'] in STORY_TIME else f'printables/unit-1/u1-story-{a["story"]}.pdf',
                      'kind': 'read' if a['story'] in STORY_TIME else 'pdf'} if st else {'title': a['library'], 'href': None, 'kind': 'library'})
            acts.append({'id': g['id'], 'version': g['version'], 'day': d['day'], 'weekday': d['weekday'], 'theme': d['title'], 'title': h['title'], 'steps': h['steps'],
                         'need': h['materials_from_home'], 'ages': a['ages'], 'min': a['minutes_estimate'], 'at_school': a['at_school'], 'three': a['three_minute'],
                         'accessible': a['accessible'], 'story': story, 'card': {'path': week_files[w['week']], 'page': j // 2 + 1}})
        weeks.append({'week': w['week'], 'theme': w['theme'], 'lead': w['lead'], 'value': w['value'], 'card': week_files[w['week']], 'activities': acts})
    data = {'release': man['release'], 'status': 'draft', 'source_sha256': sha, 'weeks': weeks}
    js = ('/* Futures Friends "This week with <friend>" (#this-week, ETEACH leverage 2 / E10). GENERATED by tools/make-unit1-packets.py from FFCRM\n'
          '   hub/content/program (unit-1-release.json family_activities and each day\'s goodbye record); do not edit by hand. Public, no account. */\n'
          'window.FFUnit1Family = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(os.path.join(PP.DATA, 'unit1-family.js'), 'w').write(js)


def prep_file(man, days, prep, sha):
    pa = man.get('prep_ahead', {})
    data = {'release': man['release'], 'status': pa.get('status', 'draft'), 'source_sha256': pa.get('sha256'), 'supplies_sha256': man['supplies']['sha256'],
            'weeks': [{'week': w, 'items': items} for w, items in sorted(prep.items()) if items],
            'supplies': {str(d['day']): compact_supplies(supplies_for(man, [(d['day'], recs)])) for d, recs in zip(man['days'], days)}}
    js = ('/* Futures Friends Unit 1 "Prep ahead this week" (R2-N4) and the day\'s deduplicated supply list (E7) for the teacher Today view.\n'
          '   GENERATED by tools/make-unit1-packets.py from FFCRM hub/content/program/unit-1-prep-ahead.json and unit-1-supplies.json (the same\n'
          '   lists the packets print); do not edit by hand. */\n'
          'window.FFUnit1Prep = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(os.path.join(PP.DATA, 'unit1-prep.js'), 'w').write(js)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='/Volumes/FFCRM/app/hub/content/program')
    a = ap.parse_args()
    man, days, sha = load(a.src)
    mp.fonts(); styles()
    PP.check()
    os.makedirs(OUT, exist_ok=True)
    sample = sorted(random.Random(SEED).sample(range(1, 21), 3))
    site_books = {b['id']: b for b in mp.site_data()['fam']['BOOKS']}
    files = []
    cp = classroom(man)
    files.append({'kind': 'classroom', 'title': 'Classroom printables: puppets, posters, zone signs, rainbow bands, songs, cards and charts', 'path': os.path.relpath(cp, PP.FILES), 'pages': pages(cp), 'status': 'draft', 'preview': preview(cp, 'u1-classroom-printables')})
    fp = family_cards(man, days); B.finish(fp)
    files.append({'kind': 'family', 'title': 'Family take-home cards, Days 1 to 20', 'path': os.path.relpath(fp, PP.FILES), 'pages': pages(fp), 'status': 'draft', 'preview': preview(fp, 'u1-family-take-home-cards')})
    week_files = {}
    for w in man['weeks']:
        idx = [i for i, d in enumerate(man['days']) if d['week'] == w['week']]
        wp = family_cards(man, days, os.path.join(OUT, f'u1-family-week-{w["week"]}.pdf'), idx, f'This week with {NAME[w["lead"]]}: family cards',
                          f'Futures Friends Unit 1 week {w["week"]} family cards (draft)')
        B.finish(wp)
        week_files[w['week']] = os.path.relpath(wp, PP.FILES)
        files.append({'kind': 'family-week', 'week': w['week'], 'title': f'Week {w["week"]} family cards: This week with {NAME[w["lead"]]}', 'path': week_files[w['week']], 'pages': pages(wp), 'status': 'draft'})
    for slug, st in man['stories'].items():
        p = story_set(man, slug, site_books); B.finish(p)
        files.append({'kind': 'story', 'title': f'Story set: {st["title"]}' + ('' if st['read_aloud_available'] else ' (cue card; read-aloud text under revision)'), 'path': os.path.relpath(p, PP.FILES), 'pages': pages(p),
                      'status': 'draft', 'preview': preview(p, f'u1-story-{slug}')})
    prep = {w: prep_week(man, days, w) for w in range(1, len(man['weeks']) + 1)}
    week_of = lambda d: [(x['day'], days[x['day'] - 1]) for x in man['days'] if x['week'] == d['week']]
    for d, recs in zip(man['days'], days):
        monday = d['weekday'] == 'Monday'
        p = day_packet(man, d, recs, CLASS_PAGES, prep[d['week']] if monday else None, week_sup=supplies_for(man, week_of(d)) if monday else None)
        B.finish(p)
        f = {'kind': 'day', 'day': d['day'], 'title': f'Day {d["day"]} teacher packet: {d["title"]}', 'path': os.path.relpath(p, PP.FILES), 'pages': pages(p), 'status': 'draft'}
        if d['day'] in sample:
            f['preview'] = preview(p, f'u1-day-{d["day"]:02d}-teacher-packet')
        files.append(f)
    recipes, bundles = site_recipes(), {}
    for d, recs in zip(man['days'], days):     # after every packet: Friday bundles take earlier days' picture-talk pages
        p, n_pages, _ = start_monday(man, days, d, recs, prep[d['week']], recipes, week_files)
        bundles[d['day']] = {'path': os.path.relpath(p, PP.FILES), 'pages': n_pages}
        f = {'kind': 'bundle', 'day': d['day'], 'title': f'Start Monday: Day {d["day"]}, {d["title"]} (one file for the day)', 'path': bundles[d['day']]['path'], 'pages': n_pages, 'status': 'draft'}
        if d['day'] in (1, 9):
            f['preview'] = preview(p, f'u1-day-{d["day"]:02d}-start-monday')
        files.append(f)
    site_file(man, days, sha, files, sample, bundles)
    family_file(man, days, sha, week_files)
    prep_file(man, days, prep, sha)
    for f in files:
        print(f'{f["path"]}: {f["pages"]} page(s)')
    print('sample days:', sample, 'source sha256:', sha[:12])


if __name__ == '__main__':
    sys.exit(main())
