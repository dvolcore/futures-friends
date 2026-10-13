"""Rebuild 02_Series_Curriculum_Production_Bible.pdf and 03_Program_Operations_Evidence_Companion.pdf.

Each PDF = "current controls" (rendered here from the current markdown in investor/documents/) + a separator page + the complete
original reference pages, carried over unchanged from the published PDF (every page after its "Original reference material"
separator). Every model figure in the markdown sits between <!-- model:KEY --> markers and is rewritten from costs/pilot-budget.json
before rendering, so the PDFs never carry a figure typed by hand. One stale passage inside the 03 original reference (partner receipts
described as part of a repayment plan) is redacted and replaced with the current rule.

Run from anywhere:  python3 investor/tools/build_reference_pdfs.py      (needs reportlab and PyMuPDF)
Then: python3 investor/tools/refresh_manifest.py and update the sha256 pins in tests/ip-lockdown.test.js.
"""
from pathlib import Path
import io, json, re
import fitz  # PyMuPDF
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, PageBreak, Image,
                                KeepTogether, NextPageTemplate)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'costs' / 'pilot-budget.json'
DOCS = ROOT / 'documents'
ASSETS = ROOT / 'Digital' / 'assets'
NAVY = colors.HexColor('#12304A'); TEAL = colors.HexColor('#2A9D8F'); PALE = colors.HexColor('#EEF6FB')
INK = colors.HexColor('#253746'); MUTED = colors.HexColor('#607487'); CALLOUT = colors.HexColor('#E6F3F1')
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

DOCS_SPEC = [
    dict(pdf='02_Series_Curriculum_Production_Bible.pdf', md='Futures_Friends_CURRENT_Master_Production_Bible.md',
         title='The world of Futures Friends', sub='Character, story, curriculum and production.',
         callout='Canon, child respect and bilingual approval guide every release.',
         pdf_title='Master production bible | Current controls + complete original reference'),
    dict(pdf='03_Program_Operations_Evidence_Companion.pdf', md='Futures_Friends_CURRENT_Operations_Companion.md',
         title='The promise. The delivery.', sub='One operating standard across classroom, home and platform.',
         callout='Responsibilities, acceptance and evidence before expansion.',
         pdf_title='Operations companion | Current controls + complete original reference'),
]
# a passage of the 03 original reference that described partner receipts as part of a repayment plan (pre-pilot national model)
REDACT = {
    '03_Program_Operations_Evidence_Companion.pdf': [(
        'Partner daycares and churches are part of the repayment plan',
        'and the later amortizing loan payment. Its site counts and margins are planning sensitivities, not contracted',
        'customers.',
        'Partner daycares and churches are Phase 2 opportunities, not part of the pilot repayment plan. Monthly curriculum licenses and '
        'support can renew; setup, training seats and merchandise create separate receipts, each evaluated on its own unit economics. '
        'Unsigned partner, licensing or merchandise receipts are excluded from debt underwriting; the current controls at the front of '
        'this document and the pilot register govern every financial figure.'),
        # v2276 (audit): the pilot has no paid substitutes; absences are covered by the floater, owner-director and head of administration
        ('The center maintains a substitute plan.', 'The center maintains a substitute plan.', 'contingency materials.',
         "The center keeps an absence-coverage plan: the floater, owner-director and head of administration cover absences (no paid "
         "substitutes). Its pack holds the day's lesson summary, safe activity, transition language, record steps and escalation "
         "contacts, printed or stored securely in case a login fails."),
        ('A substitute receives time-limited access', 'A substitute receives time-limited access', 'contingency pack.',
         'A covering adult gets time-limited access or a printed pack.'),
        ('and substitute pack.', 'and substitute pack.', 'substitute pack.', 'and absence-coverage pack.')],
}


def money(v):
    return ('-$' if v < 0 else '$') + f'{abs(v):,.2f}'


def whole(v):
    return ('-$' if v < 0 else '$') + (f'{abs(v):,.0f}' if float(v).is_integer() else f'{abs(v):,.2f}')


def long_date(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return f'{d} {MONTHS[m - 1]} {y}'


def model_blocks(d):
    """The text of every <!-- model:KEY --> block, from the model."""
    a, st, m, f, t, rc = d['assumptions'], d['staffing'], d['metrics'], d['funding'], d['totals'], d['recurring_components']
    cap, n = a['capacity'], d['meta']['line_count']
    paid = [x for x in d['lines'] if x['category'] == 'Staff wages' and x['rate'] > 0]
    rate = whole(paid[0]['rate']); part = sum(1 for x in paid if x['quantity'] < 2080)
    tablets = next(x for x in d['lines'] if x['item'] == 'School-owned tablets')['quantity']
    mdm = next(x for x in d['lines'] if x['item'] == 'Device management allowance')['quantity'] / 12
    csv = f'Pilot_{cap}_Children_Itemized.csv'
    assert (ROOT / 'costs' / csv).exists(), csv
    budgets = ''
    if rc.get('food_cap_monthly'):
        budgets = (f" Owner-set budgets: food and nutrition is capped at {money(rc['food_cap_monthly'])}/month, with menus still meeting the "
                   f"Missouri meal pattern; toiletries and cleaning stay within {money(rc['cleaning_budget_monthly'])}/month ({money(rc['cleaning_annual'])}/year "
                   f"with paper towels halved); classroom and office consumables are halved to {money(rc['classroom_consumables_annual'])}/year; utilities (electricity, gas, "
                   f"water/sewer) are locked at {money(rc['utilities_annual'] / 12)}/month; tax preparation is "
                   f"{money(next(x['annual'] for x in d['lines'] if x['item'] == 'Tax preparation'))}/year; curriculum mapping is "
                   f"{money(next(x['annual'] for x in d['lines'] if x['item'].startswith('Initial curriculum completion')))} one-time, and native Spanish review is "
                   f"{money(next(x['annual'] for x in d['lines'] if x['item'] == 'Native Spanish curriculum review'))} one-time, with no recurring curriculum or Spanish review fee; RN consultation is "
                   f"{money(next(x['annual'] for x in d['lines'] if x['item'] == 'RN recurring consultation'))}/year; administration is cut to "
                   f"{money(round(sum(x['annual'] for x in d['lines'] if x['category'] == 'Administration' and x['bucket'] == 'recurring'), 2))}/year (part-time bookkeeper); building upkeep is handled in-house (lawn, HVAC "
                   f"service, electrical, parking and staff mobile removed; snow halved).")
    pos = m['year2_margin'] > 0
    tuition = f"{whole(a['tuition_weekly'])}/week ({whole(a['tuition'])}/month)"
    staff = (f"The owner serves as director, unpaid; {st['full_time']} full-time caregivers and {part} part-time floater are paid {rate}/hour, "
             f"with {st['floor_caregivers']} caregivers on the floor in {st['groups']} groups of no more than {st['max_group']}. "
             + st.get('additional_coverage', ''))
    payback = (f" Net cash turns positive in month {m.get('first_cash_positive_month')}; cumulative pilot cash turns positive in month "
               f"{m.get('cumulative_cash_positive_month')} at the month-12 rate, before building payments and debt.")
    margin = (f"At the locked-in {tuition} tuition and {a['collection'] * 100:.0f}% collection, year-two operating margin is {money(m['year2_margin'])} "
              f"before building payment or debt, and operating break-even is {money(m['breakeven_tuition'])} tuition per child per month. "
              + ('The building payment and lender terms are unknown, so no loan affordability or profit after debt is claimed.' if pos else
                 'The model does not claim profitability.') + payback)
    finance_bible = (
        f"The current planning case is a one-location, {cap}-child, 12-month pilot of all-day care for ages {a['ages']} (model {d['meta']['version']}). "
        f"The itemized model contains {n} individually priced lines: {money(t['recurring'])} recurring cost, {money(t['one_time'])} one-time cost, "
        f"and {money(t['contingency'])} contingency, for a {money(t['gross_first_year'])} gross year-one requirement including contingency. "
        f"A separate {whole(t['refinance'])} owner-stated refinance-enabling need is shown separately. The {money(f['request_before_financing'])} figure "
        f"is a planning cash estimate before financing, not an approved or financeable loan ask. Under the stated timing assumptions, the model shows "
        f"a {money(f['peak_deficit'])} peak deficit and a {money(f['cash_floor'])} cash floor. {staff}{budgets} Building debt payment, creator invoice "
        f"and supplier quotes remain unresolved. {margin}")
    finance_ops = (
        f"The pilot package does not propose a fixed loan amount or promise repayment. The current planning case is a one-location, {cap}-child, "
        f"12-month pilot (model {d['meta']['version']}): {money(t['recurring'])} recurring cost, {money(t['one_time'])} one-time cost, "
        f"{money(t['contingency'])} contingency, and {money(t['gross_first_year'])} gross year-one requirement including contingency. The separate "
        f"{whole(t['refinance'])} owner-stated refinance-enabling need and the {money(f['request_before_financing'])} planning cash estimate before "
        f"financing are not approved or financeable loan amounts. The model shows a {money(f['peak_deficit'])} peak deficit and a "
        f"{money(f['cash_floor'])} cash floor. {staff}{budgets} {margin} No equity is offered; any debt terms require verified operating evidence "
        f"and a written lender offer.")
    decisions = (
        f"- The pilot package does not propose a fixed loan amount or promise repayment. The {money(f['request_before_financing'])} figure is a "
        f"planning cash estimate before financing; any financing must be sized after verified enrollment, capacity, payroll, building terms and a "
        f"positive recurring cash plan after building payments. No equity is offered in this plan.\n"
        + (f"- At the stated tuition and collection assumptions, the pilot shows a positive year-two operating margin of {money(m['year2_margin'])} "
           f"before building payment or debt, with the owner as unpaid director; signed enrollment, the building payment and lender terms must be "
           f"documented before lender terms are negotiated." if pos else
           f"- At the stated tuition and collection assumptions, the pilot has a negative year-two operating margin of {money(m['year2_margin'])} "
           f"before building payment or debt; pricing, scope, staffing and demand require a documented reset before lender terms are negotiated."))
    return {
        'prepared': f"{long_date(d['meta']['prepared'])} (model {d['meta']['version']})",
        'finance': finance_bible, 'finance_ops': finance_ops, 'decisions': decisions,
        'tablets': (f"The pilot models {tablets:g} school-owned classroom tablets with a {mdm:g}-device management minimum; a family tablet "
                    f"program is a Phase 2 planning assumption."),
        'lines': f'the {n}-line itemized CSV',
        'costrow': f"`investor/costs/pilot-budget.json`, `{csv}` | {cap}-child pilot register; allowances are not quotes; financing costs excluded unless modeled",
    }


def fill(md, blocks, ops):
    def sub(mt):
        key = mt.group(1); text = blocks['finance_ops' if (key == 'finance' and ops) else key]
        nl = '\n' if mt.group(2).startswith('\n') else ''
        return f'<!-- model:{key} -->{nl}{text}{nl}<!-- /model:{key} -->'
    out, count = re.subn(r'<!-- model:(\w+) -->(.*?)<!-- /model:\1 -->', sub, md, flags=re.S)
    assert count, 'no model markers found'
    return out


# ------------------------------------------------------------------ markdown -> ReportLab
def styles():
    s = getSampleStyleSheet()
    add = lambda name, **kw: s.add(ParagraphStyle(name, parent=s['Normal'], **kw))
    add('CoverT', fontName='Helvetica', fontSize=27, leading=32, textColor=NAVY, alignment=1, spaceAfter=10)
    add('CoverS', fontName='Helvetica', fontSize=10.5, leading=14, textColor=MUTED, spaceAfter=12)
    add('Call', fontName='Helvetica', fontSize=8.5, leading=11, textColor=INK)
    add('Pillars', fontName='Helvetica', fontSize=10, leading=13, textColor=TEAL, spaceBefore=10)
    add('Note', fontName='Helvetica', fontSize=7, leading=9, textColor=INK)
    add('H1r', fontName='Helvetica', fontSize=17, leading=21, textColor=NAVY, spaceBefore=6, spaceAfter=8)
    add('H2r', fontName='Helvetica', fontSize=14, leading=18, textColor=NAVY, spaceBefore=12, spaceAfter=6)
    add('H3r', fontName='Helvetica', fontSize=10.5, leading=14, textColor=TEAL, spaceBefore=8, spaceAfter=5)
    add('Bodyr', fontName='Helvetica', fontSize=8.2, leading=12, textColor=INK, spaceAfter=6)
    add('Quote', fontName='Helvetica-Oblique', fontSize=8, leading=11.5, textColor=MUTED, leftIndent=10, spaceAfter=6)
    add('Bul', fontName='Helvetica', fontSize=8.2, leading=12, textColor=INK, leftIndent=12, bulletIndent=2, spaceAfter=2)
    add('Cell', fontName='Helvetica', fontSize=6.8, leading=8.8, textColor=INK)
    add('CellH', fontName='Helvetica-Bold', fontSize=6.8, leading=8.4, textColor=colors.white)
    add('SepT', fontName='Helvetica', fontSize=22, leading=27, textColor=NAVY, spaceAfter=14)
    return s


def clean(text):
    return str(text).replace('≤', 'up to ').replace('−', '-').replace('→', 'to ')


def inline(text):
    t = clean(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: f'<link href="{m.group(2)}" color="#286FA6">{m.group(1)}</link>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'`([^`]+)`', r'<font name="Courier">\1</font>', t)
    return t


def md_flowables(md, s):
    md = re.sub(r'<!--.*?-->\n?', '', md, flags=re.S)
    lines = md.split('\n'); out = []; i = 0; first_h1 = True
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip(): i += 1; continue
        if ln.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells): rows.append(cells)
                i += 1
            ncol = len(rows[0]); width = 7.3 * inch / ncol
            data = [[Paragraph(inline(c), s['CellH'] if r == 0 else s['Cell']) for c in row] for r, row in enumerate(rows)]
            tb = Table(data, colWidths=[width] * ncol, repeatRows=1, hAlign='LEFT')
            cmd = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (-1, 0), NAVY), ('LINEBELOW', (0, 0), (-1, -1), .25, colors.HexColor('#D4E0E8')),
                   ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]
            cmd += [('BACKGROUND', (0, r), (-1, r), PALE) for r in range(1, len(data)) if r % 2]
            tb.setStyle(TableStyle(cmd)); out += [tb, Spacer(1, 8)]; continue
        if ln.startswith('# '):
            i += 1; continue          # the document name is on the cover
        if ln.startswith('## '):
            out.append(Paragraph(inline(ln[3:]), s['H1r'] if first_h1 else s['H2r'])); first_h1 = False
        elif ln.startswith('### '): out.append(Paragraph(inline(ln[4:]), s['H3r']))
        elif ln.startswith('> '): out.append(Paragraph(inline(ln[2:]), s['Quote']))
        elif ln.startswith('- '): out.append(Paragraph(inline(ln[2:]), s['Bul'], bulletText='•'))
        elif re.match(r'\d+\. ', ln):
            num, rest = ln.split('. ', 1); out.append(Paragraph(inline(rest), s['Bul'], bulletText=num + '.'))
        else:
            para = [ln.strip()]
            while i + 1 < len(lines) and lines[i + 1].strip() and not re.match(r'(#|\||> |- |\d+\. )', lines[i + 1]):
                i += 1; para.append(lines[i].strip())
            out.append(Paragraph(inline(' '.join(para)), s['Bodyr']))
        i += 1
    return out


class FrontDoc(BaseDocTemplate):
    def __init__(self, buf, spec, footer, sep):
        super().__init__(buf, pagesize=letter, leftMargin=.6 * inch, rightMargin=.6 * inch, topMargin=.62 * inch, bottomMargin=.62 * inch,
                         title=spec['pdf_title'], author='Futures Friends')
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='f')
        self.footer, self.short = footer, spec['title']
        self.addPageTemplates([PageTemplate(id='main', frames=frame, onPage=self.page),
                               PageTemplate(id='sep', frames=frame, onPage=self.sep_page)])
        self.sep = sep

    def page(self, c, doc):
        w, h = letter; c.saveState()
        c.setFillColor(NAVY); c.rect(0, h - .16 * inch, w, .16 * inch, fill=1, stroke=0)
        c.setFillColor(MUTED); c.setFont('Helvetica', 6.8)
        c.drawString(.6 * inch, .32 * inch, self.footer)
        c.drawRightString(w - .6 * inch, .32 * inch, f'{self.short}  |  {doc.page}')
        c.restoreState()

    def sep_page(self, c, doc):
        w, h = letter; c.saveState(); c.setFillColor(colors.HexColor('#F4F8FB')); c.rect(0, 0, w, h, fill=1, stroke=0); c.restoreState()


def jpeg(path, quality=82, width=1440):
    """Embed photos as ~200 dpi JPEG (ReportLab would store a WebP as raw pixels: megabytes per copy)."""
    from PIL import Image as PILImage
    im = PILImage.open(path).convert('RGB')
    if im.width > width: im = im.resize((width, round(im.height * width / im.width)), PILImage.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=quality, optimize=True); buf.seek(0)
    return buf


def front_pages(spec, md, d, s):
    n, ver = d['meta']['line_count'], d['meta']['version']
    footer = f"FUTURES FRIENDS  |  CURRENT INVESTOR PACKAGE  |  MODEL {ver.upper()}  |  {long_date(d['meta']['prepared']).upper()}"
    buf = io.BytesIO(); doc = FrontDoc(buf, spec, footer, True)
    call = Table([[Paragraph(inline(spec['callout']), s['Call'])]], colWidths=[7.2 * inch])
    call.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), CALLOUT), ('LINEBEFORE', (0, 0), (0, -1), 3, TEAL),
                              ('TOPPADDING', (0, 0), (-1, -1), 9), ('BOTTOMPADDING', (0, 0), (-1, -1), 9), ('LEFTPADDING', (0, 0), (-1, -1), 12)]))
    st = [Image(str(ASSETS / 'ff-wordmark.webp'), width=2.3 * inch, height=1.07 * inch, kind='proportional'), Spacer(1, 18),
          Paragraph(spec['title'], s['CoverT']), Paragraph(spec['sub'], s['CoverS']), call, Spacer(1, 16),
          Image(jpeg(ASSETS / 'keyart.webp'), width=7.2 * inch, height=4.05 * inch, kind='proportional'),
          Paragraph('LEARN / MOVE / EXPLORE / BELONG', s['Pillars']),
          Paragraph(inline(f"Current controls: {long_date(d['meta']['prepared'])} (model {ver}). The complete original reference material follows "
                           f"the current controls; it carries no pilot financial figures. The {n}-line pilot register and the 12-month pilot cash "
                           f"schedule govern every number."), s['Note']), PageBreak()]
    st += md_flowables(md, s)
    st += [NextPageTemplate('sep'), PageBreak(), Paragraph('Original reference material', s['SepT']),
           Paragraph(inline(f"The complete original document follows for its narrative, curriculum and operational detail. It carries no pilot "
                            f"financial figures: the current controls at the front, the {n}-line pilot register (model {ver}) and the 12-month "
                            f"pilot cash schedule govern every number. Partner, licensing, tablet and merchandise receipts described in it are "
                            f"Phase 2 opportunities, not pilot financing."), s['Bodyr']), Spacer(1, 40),
           Image(jpeg(ASSETS / 'keyart.webp'), width=7.4 * inch, height=4.16 * inch, kind='proportional')]
    doc.build(st)
    return fitz.open(stream=buf.getvalue(), filetype='pdf')


def reference_pages(path):
    """The original reference pages: everything after the page that opens with 'Original reference material'."""
    src = fitz.open(path)
    sep = next(i for i, p in enumerate(src) if p.get_text().lstrip().startswith('Original reference material'))
    return src, sep + 1


def redact(doc, first_ref, rules):
    for start, end_line, last_word, replacement in rules:
        for pno in range(first_ref, doc.page_count):
            page = doc[pno]
            a = page.search_for(start)
            if not a: continue
            b = page.search_for(end_line)
            c = [r for r in page.search_for(last_word) if r.y0 >= b[0].y0 - 1]
            rect = fitz.Rect(a[0].x0, a[0].y0 - 1, page.rect.width - 40, c[0].y1 + 1)
            # match the original body size and colour where the passage starts
            size, color = 8.6, (0.145, 0.216, 0.275)
            for blk in page.get_text('dict')['blocks']:
                for ln in blk.get('lines', []):
                    for sp in ln['spans']:
                        if fitz.Rect(sp['bbox']).intersects(a[0]) and sp['text'].strip():
                            size = round(sp['size'] * 0.92, 1); col = sp['color']; color = (((col >> 16) & 255) / 255, ((col >> 8) & 255) / 255, (col & 255) / 255)
            page.add_redact_annot(rect, fill=(1, 1, 1))
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
            rc = page.insert_textbox(rect + (0, 0, 0, 40), replacement, fontname='helv', fontsize=size, color=color, lineheight=1.32)
            assert rc >= 0, 'replacement text does not fit'
            print(f'  redacted and replaced p{pno + 1}: {start[:50]}...')
            break
        else:
            print(f'  already current (not found): {start[:50]}...')


def main():
    d = json.loads(DATA.read_text()); s = styles(); blocks = model_blocks(d)
    for spec in DOCS_SPEC:
        mdp = DOCS / spec['md']; md = fill(mdp.read_text(), blocks, ops=spec['md'].endswith('Operations_Companion.md'))
        mdp.write_text(md)
        pdfp = ROOT / spec['pdf']
        src, first_ref = reference_pages(pdfp)
        out = front_pages(spec, md, d, s)
        front = out.page_count
        out.insert_pdf(src, from_page=first_ref)
        redact(out, front, REDACT.get(spec['pdf'], []))
        out.set_metadata({'title': spec['pdf_title'], 'author': 'Futures Friends', 'producer': 'Futures Friends build_reference_pdfs.py (ReportLab + PyMuPDF)'})
        data = out.tobytes(garbage=4, deflate=True, deflate_images=False, clean=False)
        src.close(); pdfp.write_bytes(data)
        # Ghostscript pass as in 138ae45d (/default: JPEGs pass through unchanged; fonts and streams are compacted)
        import shutil, subprocess
        if shutil.which('gs'):
            tmp = pdfp.with_suffix('.gs.pdf')
            subprocess.run(['gs', '-q', '-dNOPAUSE', '-dBATCH', '-sDEVICE=pdfwrite', '-dPDFSETTINGS=/default', '-dCompatibilityLevel=1.6',
                            '-sOutputFile=' + str(tmp), str(pdfp)], check=True)
            tmp.replace(pdfp); data = pdfp.read_bytes()
        print(f"{pdfp.name}: {front} current-control pages + {out.page_count - front} original reference pages, {len(data):,} bytes")


if __name__ == '__main__':
    main()
