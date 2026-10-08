#!/usr/bin/env python3
"""Builds the printables and the staff-only site data for a written unit after Unit 1 (Units 2 to 12, wave 11).

    python3 tools/make-unit-packets.py --unit 2 [--src /Volumes/FFCRM/app/hub/content/program]

Reads the canonical records the FFCRM repo builds from its authoring source (hub/scripts/build-unit.mjs): unit-<n>/day-NN.json,
unit-<n>-release.json and unit-<n>-supplies.json. IP LOCKDOWN (2026-10-07): writes to the PRIVATE platform repo
(tools/private_paths.py: $FF_CURRICULUM_PRIVATE/files/printables/unit-<n>/ and .../data/), never into this public site:
  u<n>-day-NN-teacher-packet.pdf (20): the day's supplies, every block with its three age versions, teacher words and the
      "Everyone can join" box, the picture-talk card (Monday to Thursday) and the family card;
  u<n>-family-take-home-cards.pdf: the 20 family cards;
  u<n>-classroom-printables.pdf: the unit's new printables (Unit 1 printables and stick puppets are reused from printables/unit-1/);
and unit<n>-data.js at the site root, which the Teacher Portal loads only for a signed-in staff session (curriculum-gate.js).
Everything is DRAFT: written by an AI builder, not reviewed by an early-childhood specialist. No AI art: plain type and shapes, plus
the existing character cut-outs and logo from tools/make-printables.py. Unit 1 keeps its own generator (tools/make-unit1-packets.py).
Needs: reportlab, fonttools (with brotli), Pillow, PyMuPDF (the same as make-printables.py).
"""
import argparse, hashlib, importlib.util, json, os, re

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Frame, KeepTogether, PageBreak, PageTemplate, Paragraph, Spacer, Table,
                                TableStyle)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location('make_printables', os.path.join(ROOT, 'tools', 'make-printables.py'))
import sys; sys.path.insert(0, os.path.join(ROOT, 'tools'))
import private_paths as PP   # IP lockdown 2026-10-07: packets and data go to the private platform repo, never the site
mp = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(mp)   # shared fonts, art, colors and drawing helpers

NAVY, GOLD, INK, MUTED, C, TINT, NAME = mp.NAVY, mp.GOLD, mp.INK, mp.MUTED, mp.C, mp.TINT, mp.NAME
W, H = letter
LABEL = {'circle': 'Morning circle', 'picture-talk': 'Picture-talk story', 'friends-live': 'Friends Live', 'activity': 'Connected activity',
         'outside': 'Outdoor activity', 'move': 'Movement', 'zones': 'Learning zones', 'story': 'Read-aloud', 'meal': 'Eat the Rainbow at the table',
         'family': 'Family share (optional)', 'goodbye': 'Closing and take-home'}
STATUS = {'ready': 'Ready', 'draft': 'Draft', 'unavailable': 'Not produced yet'}
CREATOR = 'tools/make-unit-packets.py'


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


ST = {}
def styles():
    S = mp.style
    ST.update(h1=S(19, 'Fredoka', NAVY, lead=23), h2=S(14, 'Fredoka', NAVY, lead=17), h3=S(11.5, 'Poppins-SemiBold', INK, lead=14.5),
              body=S(10, lead=13.4), small=S(8.6, color=MUTED, lead=11.2), say=S(10, lead=13.4, color=HexColor('#0B3C4E')),
              big=S(14, 'Fredoka', INK, lead=19), cell=S(9, lead=11.6), cellb=S(9, 'Poppins-SemiBold', lead=11.6), th=S(9, 'Poppins-SemiBold', white, lead=11.6))


def P(text, st='body'):
    return Paragraph(text, ST[st])


class Doc(BaseDocTemplate):
    def __init__(self, path, title, sub, foot, subject, color):
        super().__init__(path, pagesize=letter, leftMargin=0.6 * inch, rightMargin=0.6 * inch, topMargin=1.42 * inch, bottomMargin=0.72 * inch,
                         title=title, author='Futures Friends', subject=subject, creator=CREATOR, invariant=1)
        self.h_title, self.h_sub, self.foot, self.color = title, sub, foot, color
        self.addPageTemplates([PageTemplate('p', [Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='f', leftPadding=0, rightPadding=0)], onPage=self.deco)])

    def deco(self, c, doc):
        c.setFillColor(NAVY); c.rect(0, H - 1.05 * inch, W, 1.05 * inch, stroke=0, fill=1)
        c.setFillColor(self.color); c.rect(0, H - 1.05 * inch - 4, W, 4, stroke=0, fill=1)
        lw, _ = mp.draw_img(c, mp.logo(), 0.45 * inch, H - 0.95 * inch, h=0.82 * inch)
        tx = 0.45 * inch + lw + 0.22 * inch  # text starts after the logo's real width, never over it
        size, room = 21, W - tx - 1.75 * inch
        while stringWidth(self.h_title, 'Fredoka', size) > room and size > 12:
            size -= 1
        c.setFillColor(white); c.setFont('Fredoka', size); c.drawString(tx, H - 0.55 * inch, self.h_title)
        ss = 9.5
        while stringWidth(self.h_sub, 'Poppins', ss) > W - tx - 0.4 * inch and ss > 6.5:
            ss -= 0.25
        c.setFillColor(HexColor('#C6D7DD')); c.setFont('Poppins', ss); c.drawString(tx, H - 0.82 * inch, self.h_sub)
        c.setFillColor(GOLD); c.roundRect(W - 1.62 * inch, H - 0.66 * inch, 1.3 * inch, 0.26 * inch, 6, stroke=0, fill=1)
        c.setFillColor(NAVY); c.setFont('Poppins-SemiBold', 8); c.drawCentredString(W - 0.97 * inch, H - 0.57 * inch, 'DRAFT · not reviewed')
        c.setFillColor(MUTED); c.setFont('Poppins', 7.4)
        # footer: shrink to fit and keep a clear gap before the page number
        pg = f'Page {doc.page}'
        fsz, avail = 7.4, W - 1.2 * inch - stringWidth(pg, 'Poppins', 7.4) - 0.5 * inch
        while stringWidth(self.foot, 'Poppins', fsz) > avail and fsz > 5.5:
            fsz -= 0.1
        c.setFont('Poppins', fsz); c.drawString(0.6 * inch, 0.4 * inch, self.foot)
        c.setFont('Poppins', 7.4); c.drawRightString(W - 0.6 * inch, 0.4 * inch, pg)


def boxed(flows, color, tint=None, pad=8):
    t = Table([[flows]], colWidths=[W - 1.2 * inch])
    sty = [('BOX', (0, 0), (-1, -1), 1.1, color), ('LEFTPADDING', (0, 0), (-1, -1), pad + 4), ('RIGHTPADDING', (0, 0), (-1, -1), pad),
           ('TOPPADDING', (0, 0), (-1, -1), pad), ('BOTTOMPADDING', (0, 0), (-1, -1), pad), ('LINEBEFORE', (0, 0), (0, -1), 5, color)]
    if tint is not None:
        sty.append(('BACKGROUND', (0, 0), (-1, -1), tint))
    t.setStyle(TableStyle(sty))
    return t


def bullets(items, st='body'):
    return [P(f'&bull;&nbsp; {esc(x)}', st) for x in items]


# ---------------------------------------------------------------- input
def load(src, n):
    rel = f'unit-{n}'
    man_path = os.path.join(src, f'{rel}-release.json')
    man = json.load(open(man_path))
    sup = json.load(open(os.path.join(src, f'{rel}-supplies.json')))
    h = hashlib.sha256(open(man_path, 'rb').read())
    days = []
    for d in man['days']:
        p = os.path.join(src, rel, f'day-{d["day"]:02d}.json')
        recs = json.load(open(p)); h.update(open(p, 'rb').read())
        if [r['id'] for r in recs] != d['records']:
            raise SystemExit(f'{p}: records disagree with the manifest; rebuild with node scripts/build-unit.mjs {n}')
        days.append(recs)
    return man, sup, days, h.hexdigest()


def supplies_for(sup, recs):
    """One deduplicated list for the day, in teach-day.js's shape: [name, kind, [blocks that use it], where from + ordinary option, setup and supervision]."""
    out, at = [], {}
    for r in recs:
        for m in r['materials']:
            hits = [e for e in sup['items'] if any(re.search(p, m, re.I) for p in e['match'])]
            if not hits:
                raise SystemExit(f'{r["id"]}: material "{m}" is not in the supply catalog')
            for e in hits:
                lab = LABEL.get(r['block'], r['block'])
                if e['id'] in at:
                    if lab not in out[at[e['id']]][2]:
                        out[at[e['id']]][2].append(lab)
                    continue
                at[e['id']] = len(out)
                where = ' '.join(x for x in [sup['kinds'][e['kind']] + '.', e.get('ordinary') or '', e.get('note') or ''] if x).strip()
                care = ' '.join(x for x in [e.get('setup') or '', e.get('supervision') or ''] if x).strip()
                out.append([e['name'], e['kind'], [lab], where, care])
    return out


# ---------------------------------------------------------------- PDFs
def block_flows(r, man):
    col = C[r['character']]
    mins = 'during the meal' if r['duration_min_estimate'] is None else f'about {r["duration_min_estimate"]} min (estimate)'
    ad = r['age_adaptations']
    rows = [[P('Twos', 'th'), P('Threes', 'th'), P('Pre-K', 'th')], [P(esc(ad['twos']), 'cell'), P(esc(ad['threes']), 'cell'), P(esc(ad['prek']), 'cell')]]
    t = Table(rows, colWidths=[(W - 1.2 * inch) / 3] * 3)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), col), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('GRID', (0, 0), (-1, -1), 0.4, HexColor('#C9D3D7')),
                           ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    head = P(f'<font color="{col.hexval().replace("0x", "#")}">{esc(LABEL.get(r["block"], r["block"]))}</font> &nbsp;<font size="8.6" color="#5B6E77">{mins} · '
             f'{NAME[r["character"]]} · {" + ".join(r["pillars"])} · Learning Steps: {", ".join(r["learning_steps"])}</font>', 'h3')
    f = [head, Spacer(1, 2), P(f'<b>Goal:</b> {esc(r["objective"])}'), Spacer(1, 4), t, Spacer(1, 4)]
    if r['prompts']:
        f += [P('<b>Say or ask</b>')] + bullets(r['prompts'], 'say')
    if r['materials']:
        f += [P(f'<b>Materials:</b> {esc("; ".join(r["materials"]))}')]
    gone = [man['assets'][m['ref']]['title'] for m in r['media'] if m['status'] == 'unavailable']
    if gone:
        f += [P(f'<b>Not produced yet:</b> {esc("; ".join(gone))}. Use the print or puppet path on this page instead.', 'small')]
    join = [P('<b>Everyone can join</b>', 'cellb')] + bullets(r['participation_alternatives'], 'cell') + [P(f'<b>Moving or seated:</b> {esc(r["movement_alternative"])}', 'cell')]
    if r['meal_reference']:
        join.append(P(f'<b>Food:</b> {esc(r["meal_reference"])}', 'cell'))
    if r['kitchen_prompt']:
        join.append(P(f'<b>For the cook and the table (optional):</b> {esc(r["kitchen_prompt"])}', 'cell'))
    f += [Spacer(1, 4), boxed(join, col, TINT[r['character']], pad=6), Spacer(1, 12)]
    return f


def family_flows(n, d, rec, act, lead):
    h = rec['home_continuation']
    col = C[lead]
    f = [P(f'Unit {n}, Day {d}: {esc(h["title"])}', 'h2'), Spacer(1, 4)] + bullets(h['steps'])
    if h['materials_from_home']:
        f.append(P(f'<b>From home (optional):</b> {esc("; ".join(h["materials_from_home"]))}'))
    f += [Spacer(1, 4), P(f'<b>Three-minute version:</b> {esc(act["three_minute"])}'), P(f'<b>For every child:</b> {esc(act["accessible"])}'),
          P(f'<b>At school today:</b> {esc(act["at_school"])}', 'small'),
          P(f'<b>A book to look for:</b> {esc(act["library"] or "")}' if act.get('library') else ' ', 'small')]
    return [boxed(f, col, TINT[lead])]


def day_packet(out, n, man, sup, recs, dinfo, wk):
    path = os.path.join(out, f'u{n}-day-{dinfo["day"]:02d}-teacher-packet.pdf')
    lead = wk['lead']
    doc = Doc(path, f'Unit {n} · Day {dinfo["day"]}: {dinfo["title"]}', f'Week {dinfo["week"]} · {dinfo["weekday"]} · {wk["theme"]} · led by {NAME[lead]}',
              f'Futures Friends · {man["title"]} · Day {dinfo["day"]} teacher packet · draft, not reviewed · for your program\'s educators only',
              f'Futures Friends {man["title"]}, Day {dinfo["day"]} teacher packet (draft)', C[lead])
    total = sum(r['duration_min_estimate'] or 0 for r in recs)
    kw = next((a for r in recs for a in r['participation_alternatives'] if a.startswith('Key words today')), '')
    story = []
    story += [P(f'{esc(dinfo["title"])}', 'h1'), P(f'{len(recs)} blocks · about {total} minutes of planned blocks (estimates until a rehearsal times a real day) · '
              'no screen or internet needed · every block has a version for twos, threes and pre-K.', 'small'), Spacer(1, 6)]
    if kw:
        story += [boxed([P(esc(kw), 'cell')], C['gold'], TINT['gold'], pad=6), Spacer(1, 8)]
    sl = supplies_for(sup, recs)
    rows = [[P('Supply', 'th'), P('Used in', 'th'), P('Where from, ordinary option, setup and supervision', 'th')]]
    for name, kind, blocks, where, care in sl:
        rows.append([P(esc(name), 'cell'), P(esc(', '.join(blocks)), 'cell'), P(esc(' '.join(x for x in [where, care] if x)), 'cell')])
    t = Table(rows, colWidths=[2.3 * inch, 1.6 * inch, W - 1.2 * inch - 3.9 * inch], repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), NAVY), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('GRID', (0, 0), (-1, -1), 0.4, HexColor('#C9D3D7')),
                           ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    story += [P('Supplies for today', 'h2'), Spacer(1, 3), t, Spacer(1, 12)]
    for r in recs:
        story += [CondPageBreak(2.2 * inch)] + block_flows(r, man)
    pt = man['picture_talk'].get(f'{dinfo["day"]:02d}')
    if pt:
        ptr = next(r for r in recs if r['block'] == 'picture-talk')
        qs = [p for p in ptr['prompts'][1:] if not p.startswith('Story-world friends')]
        cast = next((p for p in ptr['prompts'] if p.startswith('Story-world friends')), '')
        story += [PageBreak(), P(f'Picture-talk card: "{esc(pt["episode"])}"', 'h1'),
                  P('The episode is not produced. Tell the same story with the friend stick puppets (Unit 1 classroom printables) and real objects. No screen needed.', 'small'),
                  Spacer(1, 8), boxed([P(esc(pt['story']), 'big')], C[lead], TINT[lead], pad=10), Spacer(1, 10), P('The story in four beats', 'h2')]
        story += [P(f'{i}. {esc(b)}', 'big') for i, b in enumerate(pt['beats'], 1)]
        story += [Spacer(1, 10), P('Then ask', 'h2')] + bullets(qs, 'say')
        if cast:
            story += [Spacer(1, 6), P(esc(cast), 'small')]
    good = next(r for r in recs if r['block'] == 'goodbye')
    story += [PageBreak(), P('Family take-home card', 'h1'), P('Copy one per family, or send the family card file. Cut on the line if you print two to a page.', 'small'), Spacer(1, 8)]
    story += family_flows(n, dinfo['day'], good, man['family_activities'][good['id']], lead)
    doc.build(story)
    return path


def family_cards(out, n, man, days):
    path = os.path.join(out, f'u{n}-family-take-home-cards.pdf')
    doc = Doc(path, f'Unit {n} family take-home cards', f'{man["title"]} · Days 1 to 20 · one card per day',
              f'Futures Friends · {man["title"]} · family take-home cards · draft, not reviewed', f'Futures Friends {man["title"]} family take-home cards (draft)', GOLD)
    story = []
    for i, recs in enumerate(days):
        good = next(r for r in recs if r['block'] == 'goodbye')
        lead = man['weeks'][i // 5]['lead']
        story += [KeepTogether(family_flows(n, i + 1, good, man['family_activities'][good['id']], lead)), Spacer(1, 14)]
    doc.build(story)
    return path


def classroom(out, n, man):
    path = os.path.join(out, f'u{n}-classroom-printables.pdf')
    doc = Doc(path, f'Unit {n} classroom printables', f'{man["title"]} · print, cut and post · the stick puppets and Unit 1 cards are in the Unit 1 printables',
              f'Futures Friends · {man["title"]} · classroom printables · draft, not reviewed', f'Futures Friends {man["title"]} classroom printables (draft)', GOLD)
    story = []
    for ref, x in man['printables'].items():
        story += [P(esc(x['title']), 'h1'), P(esc(x.get('note') or ''), 'small'), Spacer(1, 8)]
        for pg in x['pages']:
            rows = [[P(esc(pg['heading']), 'big')]] + [[P(esc(line), 'body')] for line in pg['lines']]
            t = Table(rows, colWidths=[W - 1.2 * inch])
            t.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1.2, NAVY), ('LINEBELOW', (0, 0), (-1, -1), 0.5, HexColor('#C9D3D7')),
                                   ('TOPPADDING', (0, 0), (-1, -1), 9), ('BOTTOMPADDING', (0, 0), (-1, -1), 9), ('LEFTPADDING', (0, 0), (-1, -1), 10)]))
            story += [KeepTogether([t]), Spacer(1, 12)]
        story.append(PageBreak())
    if story and isinstance(story[-1], PageBreak):
        story.pop()
    doc.build(story)
    return path


def pages(path):
    import fitz
    with fitz.open(path) as d:
        return d.page_count


# ---------------------------------------------------------------- site data (staff only)
def site_data(n, man, sup, days, sha, files):
    ds = []
    for i, recs in enumerate(days):
        d = man['days'][i]
        good = next(r for r in recs if r['block'] == 'goodbye')
        ds.append({'day': d['day'], 'week': d['week'], 'weekday': d['weekday'], 'title': d['title'], 'packet': f'printables/unit-{n}/u{n}-day-{d["day"]:02d}-teacher-packet.pdf',
                   'supplies': supplies_for(sup, recs), 'picture_talk': man['picture_talk'].get(f'{d["day"]:02d}'),
                   'home': good['home_continuation'], 'family': man['family_activities'][good['id']],
                   'blocks': [{k: r[k] for k in ['id', 'block', 'character', 'pillars', 'objective', 'learning_steps', 'age_adaptations', 'duration_min_estimate',
                                                 'materials', 'prompts', 'participation_alternatives', 'movement_alternative', 'meal_reference',
                                                 'family_connection', 'kitchen_prompt']} | {'media': [[m['ref'], m['status']] for m in r['media']]} for r in recs]})
    counts = {'days': len(days), 'activities': sum(len(r) for r in days), 'assets': man['asset_counts']}
    data = {'release': man['release'], 'n': n, 'version': man['version'], 'status': man['status'], 'title': man['title'], 'ages': man['ages'], 'length': man['length'],
            'big_idea': man['big_idea'], 'approval': man['approval'], 'status_key': man['status_key'], 'duration_note': man['duration_note'],
            'no_screen_rule': man['no_screen_rule'], 'source_sha256': sha, 'built_by': f'{CREATOR} from FFCRM hub/content/program (unit-{n}-release.json, unit-{n}/day-NN.json, unit-{n}-supplies.json)',
            'weeks': man['weeks'], 'songs': man['songs'], 'assets': {k: [a['type'], a['title'], a['status']] for k, a in man['assets'].items()},
            'counts': counts, 'days': ds, 'files': files}
    return (f'/* Futures Friends Unit {n} release data for the Teacher Portal Curriculum tab. GENERATED by {CREATOR} from the canonical records in the\n'
            f'   FFCRM repo (hub/content/program, built from hub/content/authoring/unit-{n}); do not edit by hand. Loaded only for a signed-in staff\n'
            f'   session (curriculum-gate.js). DRAFT: written by an AI builder, not reviewed. */\n'
            f'window.FFUnitData = window.FFUnitData || {{}};\nwindow.FFUnitData[{n}] = {json.dumps(data, ensure_ascii=False, separators=(",", ":"))};\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--unit', type=int, required=True)
    ap.add_argument('--src', default='/Volumes/FFCRM/app/hub/content/program')
    ap.add_argument('--data-only', action='store_true', help='write unit<n>-data.js only (the PDFs must already exist)')
    a = ap.parse_args()
    n = a.unit
    if n < 2:
        raise SystemExit('Unit 1 has its own generator: tools/make-unit1-packets.py')
    man, sup, days, sha = load(a.src, n)
    PP.check()
    out = os.path.join(PP.FILES, 'printables', f'unit-{n}')
    os.makedirs(out, exist_ok=True)
    mp.fonts(); styles()
    files = []
    for i, recs in enumerate(days):
        dinfo = man['days'][i]
        p = os.path.join(out, f'u{n}-day-{dinfo["day"]:02d}-teacher-packet.pdf') if a.data_only else day_packet(out, n, man, sup, recs, dinfo, man['weeks'][i // 5])
        files.append({'kind': 'day', 'day': dinfo['day'], 'title': f'Day {dinfo["day"]}: {dinfo["title"]} (teacher packet)', 'path': os.path.relpath(p, PP.FILES), 'pages': pages(p), 'status': 'draft'})
    for kind, fn, title in [('family', family_cards, f'Unit {n} family take-home cards, Days 1 to 20'), ('classroom', classroom, f'Unit {n} classroom printables')]:
        p = os.path.join(out, f'u{n}-{"family-take-home-cards" if kind == "family" else "classroom-printables"}.pdf') if a.data_only else fn(out, n, man) if kind == 'classroom' else fn(out, n, man, days)
        files.append({'kind': kind, 'title': title, 'path': os.path.relpath(p, PP.FILES), 'pages': pages(p), 'status': 'draft'})
    js = site_data(n, man, sup, days, sha, files)
    open(os.path.join(PP.DATA, f'unit{n}-data.js'), 'w').write(js)
    print(f'unit {n}: {len(days)} days, {sum(len(r) for r in days)} activities, {len(files)} files, {sum(f["pages"] for f in files)} pages')


if __name__ == '__main__':
    main()
