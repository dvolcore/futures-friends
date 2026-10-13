"""Build the current, evidence-led pilot investor PDFs from pilot-budget.json."""
from pathlib import Path
import json
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT
DATA = ROOT / 'costs' / 'pilot-budget.json'
ASSETS = ROOT / 'Digital' / 'assets'
NAVY = colors.HexColor('#12304A'); BLUE = colors.HexColor('#286FA6')
PURPLE = colors.HexColor('#6846A5'); ORANGE = colors.HexColor('#ED7D43')
CREAM = colors.HexColor('#FFF9F1'); PALE = colors.HexColor('#EEF6FB')
INK = colors.HexColor('#253746'); MUTED = colors.HexColor('#607487')
RED = colors.HexColor('#A83232'); GREEN = colors.HexColor('#237A61')

MONTHS=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']
FOOTER='FUTURES FRIENDS'   # set from the model in main()

def long_date(iso, upper=False):
    y,m,dd=(int(x) for x in iso.split('-')); s=f'{dd} {MONTHS[m-1].title()} {y}'
    return s.upper() if upper else s

def whole(v):
    return ('-$' if v < 0 else '$') + (f'{abs(v):,.0f}' if float(v).is_integer() else f'{abs(v):,.2f}')

def money(v):
    if v is None: return 'UNKNOWN'
    return ('-$' if v < 0 else '$') + f'{abs(v):,.2f}'

class NumberedDoc(BaseDocTemplate):
    def __init__(self, filename, title, one=False):
        super().__init__(filename, pagesize=letter, leftMargin=.57*inch, rightMargin=.57*inch,
                         topMargin=.58*inch, bottomMargin=.52*inch, title=title, author='Futures Friends')
        frame=Frame(self.leftMargin,self.bottomMargin,self.width,self.height,id='normal')
        self.addPageTemplates([PageTemplate(id='main',frames=frame,onPage=self._page)])
        self.one=one
    def _page(self, canv, doc):
        canv.saveState(); w,h=letter
        canv.setFillColor(NAVY); canv.rect(0,h-.16*inch,w,.16*inch,fill=1,stroke=0)
        canv.setFillColor(MUTED); canv.setFont('Helvetica',7.2)
        canv.drawString(.57*inch,.27*inch,FOOTER)
        canv.drawRightString(w-.57*inch,.27*inch,f'{doc.page}')
        canv.restoreState()

def styles():
    s=getSampleStyleSheet()
    s.add(ParagraphStyle('Cover',parent=s['Title'],fontName='Helvetica-Bold',fontSize=28,leading=31,textColor=NAVY,spaceAfter=12))
    s.add(ParagraphStyle('Kicker',parent=s['Normal'],fontName='Helvetica-Bold',fontSize=9,leading=11,textColor=ORANGE,tracking=1.4,spaceAfter=7))
    s.add(ParagraphStyle('H1x',parent=s['Heading1'],fontName='Helvetica-Bold',fontSize=20,leading=23,textColor=NAVY,spaceBefore=2,spaceAfter=10))
    s.add(ParagraphStyle('H2x',parent=s['Heading2'],fontName='Helvetica-Bold',fontSize=12,leading=15,textColor=PURPLE,spaceBefore=8,spaceAfter=5))
    s.add(ParagraphStyle('Bodyx',parent=s['BodyText'],fontName='Helvetica',fontSize=8.5,leading=12,textColor=INK,spaceAfter=6))
    s.add(ParagraphStyle('Smallx',parent=s['BodyText'],fontName='Helvetica',fontSize=7.1,leading=9,textColor=MUTED,spaceAfter=3))
    s.add(ParagraphStyle('Metric',parent=s['Normal'],fontName='Helvetica-Bold',fontSize=15,leading=17,textColor=NAVY,alignment=TA_CENTER))
    s.add(ParagraphStyle('MetricLabel',parent=s['Normal'],fontName='Helvetica',fontSize=7.2,leading=9,textColor=MUTED,alignment=TA_CENTER))
    s.add(ParagraphStyle('Tiny',parent=s['Normal'],fontName='Helvetica',fontSize=6.1,leading=7.3,textColor=INK))
    s.add(ParagraphStyle('TableBody',parent=s['Normal'],fontName='Helvetica',fontSize=7.2,leading=9.2,textColor=INK))
    s.add(ParagraphStyle('TableHead',parent=s['Normal'],fontName='Helvetica-Bold',fontSize=7.3,leading=8.5,textColor=colors.white))
    return s

# The standard PDF fonts are WinAnsi: spell out the few model characters they cannot draw.
def clean(text): return str(text).replace('≤','up to ').replace('−','-').replace('→','to')
def P(text, st): return Paragraph(clean(text).replace('&','&amp;'), st)
def table(data, widths, header=True, font=7.2):
    t=Table(data,colWidths=widths,repeatRows=1 if header else 0,hAlign='LEFT')
    cmd=[('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('GRID',(0,0),(-1,-1),.25,colors.HexColor('#D4E0E8'))]
    if header: cmd += [('BACKGROUND',(0,0),(-1,0),NAVY),('TEXTCOLOR',(0,0),(-1,0),colors.white)]
    for r in range(1 if header else 0,len(data)):
        if r%2: cmd.append(('BACKGROUND',(0,r),(-1,r),PALE))
    t.setStyle(TableStyle(cmd)); return t

def priced_table(rows, widths, s):
    return table([[P(x, s['TableHead'] if i == 0 else s['TableBody']) for x in row] for i, row in enumerate(rows)], widths)

SITE='https://dvolcore.github.io/futures-friends/investor/'

def facts(d):
    """Every label and number the PDFs print, read from pilot-budget.json (nothing typed by hand)."""
    a,st,m,f,t=d['assumptions'],d['staffing'],d['metrics'],d['funding'],d['totals']
    cap=a['capacity']; cash=d['cash']
    wages=[x for x in d['lines'] if x['category']=='Staff wages']
    paid=[x for x in wages if x['rate']>0]
    rates=sorted({x['rate'] for x in paid})
    floaters=[x for x in paid if x['quantity']<2080]
    csv_name=f'Pilot_{cap}_Children_Itemized.csv'
    assert (ROOT/'costs'/csv_name).exists(), csv_name
    full_month=next(x['month'] for x in cash if x['children']>=cap)
    positive_month=next((x['month'] for x in cash if x['net']>0),None)
    build=d['platform']['build_rows']
    return dict(cap=cap,ages=a['ages'],tuition=a['tuition'],weekly=a['tuition_weekly'],collection=a['collection'],
        version=d['meta']['version'],prepared=d['meta']['prepared'],lines=d['meta']['line_count'],
        ramp_start=a['cash_ramp'][0],full_month=full_month,positive_month=positive_month,
        full_time=st['full_time'],part_time=len(floaters),paid_people=st['paid_people'],floor=st['floor_caregivers'],
        groups=st['groups'],max_group=st['max_group'],wages=st['wages'],rate=whole(rates[0]) if len(rates)==1 else ' / '.join(whole(r) for r in rates),
        director_ref=d['reference']['market_director_all_in'],margin=m['year2_margin'],breakeven=m['breakeven_tuition'],
        breakeven_week=m['breakeven_tuition']*12/52,receipts=m['full_enrollment_receipts'],
        csv=csv_name,csv_url=SITE+'costs/'+csv_name,cash_csv=f'Pilot_{cap}_Children_Monthly_Cash.csv',
        build_hours=sum(x['quantity'] for x in build),build_rate=build[0]['rate'],
        marketing=sum(x['annual'] for x in d['lines'] if x['category']=='Local marketing'),
        gen_cap=next(x['annual'] for x in d['lines'] if x['item'].startswith('Generation credits')),
        refinance=t['refinance'],food_month=d['recurring_components'].get('food_cap_monthly'),cleaning_month=(d['recurring_components'].get('cleaning_annual') or 0)/12,cleaning_budget=d['recurring_components'].get('cleaning_budget_monthly'),classroom=d['recurring_components'].get('classroom_consumables_annual'),utilities_month=(d['recurring_components'].get('utilities_annual') or 0)/12,tax_prep=next(x['annual'] for x in d['lines'] if x['item']=='Tax preparation'),curriculum=next(x['annual'] for x in d['lines'] if x['item'].startswith('Initial curriculum completion')),spanish=next(x['annual'] for x in d['lines'] if x['item']=='Native Spanish curriculum review'),rn=next(x['annual'] for x in d['lines'] if x['item']=='RN recurring consultation'),admin=round(sum(x['annual'] for x in d['lines'] if x['category']=='Administration' and x['bucket']=='recurring'),2))

def budgets_sentence(k):
    if not k['food_month']: return ''
    return (f"Owner-set budgets: food and nutrition capped at {money(k['food_month'])}/month ({money(k['food_month']*12)}/year), held at the cap through the enrollment ramp, "
            f"while menus still meet the Missouri meal pattern (5 CSR 25-500.202); toiletries and cleaning within {money(k['cleaning_budget'])}/month ({money(k['cleaning_month']*12)}/year with paper towels halved); "
            f"classroom and office consumables halved to {money(k['classroom'])}/year; "
            f"utilities (electricity, gas, water/sewer) locked at {money(k['utilities_month'])}/month; tax preparation {money(k['tax_prep'])}/year; curriculum mapping {money(k['curriculum'])} and native Spanish review {money(k['spanish'])}, one-time, with no recurring curriculum or Spanish review fee; RN consultation {money(k['rn'])}/year; administration cut to {money(k['admin'])}/year (part-time bookkeeper); building upkeep handled in-house (lawn, HVAC service, electrical, parking and staff mobile removed; snow halved).")

def metric_grid(d,s,k):
    vals=[(money(d['funding']['request_before_financing']),'FUNDING ESTIMATE BEFORE FINANCING'),(money(d['totals']['gross_first_year']),'YEAR 1 WITH CONTINGENCY'),(money(d['totals']['recurring']),'ANNUAL RECURRING'),(money(d['metrics']['year2_margin']),f"YEAR 2 OPERATING MARGIN AT {whole(k['weekly'])}/WEEK")]
    cells=[]
    for v,l in vals: cells.append([P(v,s['Metric']),P(l,s['MetricLabel'])])
    t=Table([cells],colWidths=[1.70*inch]*4,rowHeights=[.62*inch])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#C9DCE8')),('INNERGRID',(0,0),(-1,-1),.5,colors.white),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),8)])); return t

def margin_sentence(k):
    if k['margin']>0:
        return (f"At the owner-confirmed locked-in tuition of {whole(k['weekly'])}/week ({whole(k['tuition'])}/month), ongoing operations show a positive operating margin of {money(k['margin'])} a year before building payments and debt, with the owner serving as unpaid director. "
                "The building payment and lender terms are unknown, so loan affordability is not established.")
    return (f"At the owner-confirmed tuition of {whole(k['tuition'])}/month, ongoing operations are negative ({money(k['margin'])} a year) even before building and investor payments. "
            "Borrowing to hide that loss would repeat the original problem.")

def build_business(d):
    k=facts(d); cap=k['cap']
    s=styles(); path=OUT/'Futures_Friends_CURRENT_Pilot_Business_Plan.pdf'; doc=NumberedDoc(str(path),'Futures Friends Current Pilot Business Plan')
    st=[]
    logo=ASSETS/'ff-wordmark.webp'
    if logo.exists(): st += [Image(str(logo),width=2.15*inch,height=.48*inch),Spacer(1,.34*inch)]
    st += [P('CURRENT PILOT BUSINESS PLAN',s['Kicker']),P('A measured first center, built to earn the right to expand.',s['Cover']),P(f"One owned location in Independence, Missouri | {cap} children ages {k['ages']}, all-day care | 12 months | first-month checkpoint",s['Bodyx']),P(f"Model {k['version']}, prepared {long_date(k['prepared'])}.",s['Smallx']),Spacer(1,.1*inch)]
    if (ASSETS/'keyart.webp').exists(): st.append(Image(str(ASSETS/'keyart.webp'),width=6.25*inch,height=2.05*inch,kind='proportional'))
    st += [Spacer(1,.18*inch),P('Futures Friends joins Booker, Lumi, Zuri and Bop to early literacy, movement, nutrition, belonging and family routines. This pilot reuses the website, CRM, ATS, store, characters and learning materials while finishing the secure family and child workflows required for one real center.',s['Bodyx']),P('<b>Decision posture:</b> This is an itemized cost estimate, not a financeable loan recommendation. '+margin_sentence(k)+' Actual liability and past creator compensation are unresolved.',s['Bodyx'])]
    st += [PageBreak(),P('1. The investment case',s['H1x']),P('The pilot is designed to answer operational questions with real families and real cash records before national rollout. Expansion is a Phase 2 decision, not part of this ask.',s['Bodyx']),metric_grid(d,s,k),Spacer(1,.18*inch)]
    snap=[['Decision item','Current model','What must be verified'],
          ['Center',f"Owned Independence, MO; ages {k['ages']}; {cap} children, all-day care",'Licensed capacity, rooms, age mix and open hours'],
          ['Staffing',f"Owner as unpaid director; {k['full_time']} full-time caregivers and {k['part_time']} part-time floater at {k['rate']}/hour",'Signed roster, payroll, and the Missouri ratio and age mix'],
          ['Funding','Funding estimate before financing '+money(d['funding']['request_before_financing']),'Not a loan ask until the building payment and lender terms are known'],
          ['Building',f"Owner-specified {whole(k['refinance'])} refinance-enabling need",'Payoff statement, closing costs, points and new payment'],
          ['Revenue',f"Locked-in {whole(k['weekly'])}/week ({whole(k['tuition'])}/month); {k['collection']*100:.0f}% collection",'Signed enrollment, discounts, demand and actual collections'],
          ['Debt','Cash after recurring operations and building payment','Lender offer, coverage, collateral and guarantees']]
    st += [priced_table(snap,[1.25*inch,2.25*inch,2.75*inch],s),Spacer(1,.1*inch),P(f"At {cap} children on the locked-in rate, annual receipts are {money(k['receipts'])} and year-two operating margin is {money(k['margin'])} before the building payment, investor debt and profit tax. Break-even realized tuition is {money(k['breakeven'])} per child per month (about {whole(round(k['breakeven_week']))}/week). Enrollment reaches {cap} in month {k['full_month']}"+(f"; the first cash-positive month is month {k['positive_month']}." if k['positive_month'] else '; no month in the first year is cash-positive.'),s['Bodyx'])]
    people=[x for x in d['lines'] if x.get('category')=='Staff wages']
    sched=d['staffing']['schedule']
    def role(x):
        if 'director' in x['item'].lower(): return 'Qualified director on duty (unpaid)'
        if 'caregiver' in x['item'].lower(): return f"{sched[0]['time']} on the floor; {sched[0]['people'].split(' in ',1)[-1]}"
        return f"{sched[1]['time']}: {sched[1]['people']}"
    st += [PageBreak(),P('2. Staffing and coverage',s['H1x']),P(f"The roster has {k['paid_people']} paid people: {k['full_time']} full-time caregivers and {k['part_time']} part-time relief floater, all at {k['rate']}/hour with no employer health benefit. The owner serves as director, unpaid; a market director (about {money(k['director_ref'])} all-in) is excluded from the budget. There is no food worker and there are no paid substitutes.",s['Bodyx'])]
    rows=[['Person','Hours/year','Rate','Annual wages','Shift / role']]
    for x in people: rows.append([x['item'],f"{x['quantity']:,.0f}",money(x['rate']),money(x['annual']),role(x)])
    st += [priced_table(rows,[1.75*inch,.7*inch,.62*inch,.85*inch,2.05*inch],s),Spacer(1,.1*inch),P('Total planning wages: '+money(d['staffing']['wages'])+'. '+d['staffing']['coverage'],s['Bodyx']),P('This pattern is conditional on the Missouri rule: '+d['staffing']['ratio_basis']+'. If a group has more than four 2-year-olds, more adults are needed. '+d['staffing']['director'],s['Bodyx']),P(d['staffing'].get('hiring_note','')+' '+d['staffing'].get('additional_coverage',''),s['Bodyx']),P('Employer taxes, workers compensation, background checks, CPR and training are separate line items. No employer medical or retirement contribution and no blanket unemployment reserve are included.',s['Smallx'])]
    st += [PageBreak(),P('3. Cash, enrollment and repayment',s['H1x']),P(f"The first-year cash schedule ramps enrollment from {k['ramp_start']} to {cap} children, reaching full enrollment in month {k['full_month']}. One-time launch spending is front-loaded into the first months; the schedule shows when cash is needed rather than treating the full annual total as a monthly payment.",s['Bodyx'])]
    cash=d['cash']; rows=[['Month','Children','Receipts','Recurring','One-time','Net','Cumulative']]
    for x in cash: rows.append([str(x['month']),str(x['children']),money(x['receipts']),money(x['recurring']),money(x['one_time']),money(x['net']),money(x['cumulative'])])
    repay=('Operating margin is positive before building payments and debt, but debt capacity stays unknown until the building payment and lender terms are known.' if k['margin']>0 else 'The present case has no positive debt capacity because operating margin is negative.')
    mt=d['metrics']
    st += [priced_table(rows,[.55*inch,.7*inch,1.0*inch,1.0*inch,1.0*inch,1.0*inch,1.15*inch],s),Spacer(1,.12*inch),P(f"<b>One-time vs recurring:</b> {money(d['totals']['one_time'])} of one-time launch and completion spending falls in months 1–{max(c['month'] for c in d['cash'] if c['one_time']>0)}; recurring cost is {money(d['totals']['recurring'])} a year. Net cash turns positive in month {mt.get('first_cash_positive_month')}; cumulative pilot cash turns positive in month {mt.get('cumulative_cash_positive_month')} at the month-12 rate (full enrollment, no further one-time costs), before building payments and debt.",s['Bodyx']),P('<b>Repayment rule:</b> monthly debt service is considered only after recurring operations and the actual building payment. A 1.25 coverage screen is a planning test, not a lender promise. '+repay,s['Bodyx']),P(f"Peak cumulative deficit: {money(d['funding']['peak_deficit'])}. One-month cash floor: {money(d['funding']['cash_floor'])}. Break-even realized tuition: {money(k['breakeven'])} per child per month before building/debt. Tuition, costs, licensed capacity and demand still require verification.",s['Bodyx'])]
    st += [PageBreak(),P('4. Every priced category',s['H1x']),P('Each row in the digital register carries an item, quantity, rate, formula, bucket, evidence basis and source URL where one exists. Published prices, tax formulas and quote-required allowances remain distinguished.',s['Bodyx'])]
    cats={}
    for x in d['lines']: cats.setdefault(x['category'],0); cats[x['category']]+=x['annual']
    rows=[['Category','Annual total','Register evidence']]
    for c,v in sorted(cats.items(),key=lambda z:-z[1]): rows.append([c,money(v),'Itemized rows in CSV / JSON'])
    st += [priced_table(rows,[2.6*inch,1.25*inch,2.45*inch],s),Spacer(1,.1*inch),P(f"The complete {k['lines']}-line register is available at <link href=\"{k['csv_url']}\" color=\"#286FA6\">{k['csv']}</link> and <link href=\"{SITE}Digital/cost-explorer.html\" color=\"#286FA6\">the digital cost explorer</link>. The PDF is a decision brief; the register is the audit trail.",s['Bodyx']),P(budgets_sentence(k),s['Bodyx'])]
    platform=d['platform']
    st += [PageBreak(),P('5. Platform delivery and acceptance',s['H1x']),P(f'The pilot reuses the existing website, CRM, ATS, store and character library. This is a completion allowance for one center and {cap} children; it is not the replacement price of everything already created.',s['Bodyx'])]
    summary=[['Platform allocation','Amount / timing'],[f"Completion: {k['build_hours']:,.0f} hours at {whole(k['build_rate'])}",money(platform['completion'])+' one-time'],['Independent test / retest and counsel',money(platform['assurance_one_time'])+' one-time'],['Total one-time platform work',money(platform['one_time'])],['Support, privacy maintenance and hosting',money(platform['recurring'])+' annually; '+money(platform['monthly'])+' monthly average'],['Year-1 platform allowance',money(platform['first_year'])],['Platform contingency already included',money(platform['contingency_included'])+' within the overall '+money(d['totals']['contingency'])+' contingency; do not add twice']]
    st += [priced_table(summary,[3.4*inch,3.05*inch],s),Spacer(1,.12*inch),P(platform['rate_basis'],s['Bodyx']),P(platform['readiness'],s['Bodyx']),P('The allowance can be enough only if an audit confirms reusable code and a contractor accepts the remaining scope. Release payment against working deliverables. Public screens alone do not establish readiness.',s['Bodyx']),P('One-time engineering: every deliverable',s['H1x'])]
    rows=[['ID / work','Calculation / amount','Why essential / acceptance evidence']]
    for x in platform['build_rows']:
        rows.append([x['id']+' '+x['item'],f"{x['quantity']:g} hours × {money(x['rate'])} = {money(x['annual'])}; one-time",x['purpose']+' '+x['deliverable']])
    st += [priced_table(rows,[1.65*inch,1.2*inch,3.6*inch],s),Spacer(1,.12*inch),P('Assurance and ongoing service',s['H1x'])]
    rows=[['ID / service','Calculation / amount','Timing / delivery']]
    for x in platform['service_rows']:
        rows.append([x['id']+' '+x['item'],f"{x['quantity']:g} {x['unit']} × {money(x['rate'])} = {money(x['annual'])}",x['bucket'].replace('_',' ')+'; '+x['purpose']+' '+x['deliverable']])
    st += [priced_table(rows,[1.65*inch,1.2*inch,3.6*inch],s),Spacer(1,.12*inch),P('Hosting, tools and recovery: recurring',s['H1x'])]
    rows=[['ID / expense','Calculation / annual amount','Purpose']]
    for x in platform['hosting_rows']:
        rows.append([x['id']+' '+x['item'],f"{x['quantity']:g} {x['unit']} × {money(x['rate'])} = {money(x['annual'])}",x['purpose']+' '+x['deliverable']])
    st += [priced_table(rows,[1.65*inch,1.2*inch,3.6*inch],s),Spacer(1,.12*inch),P('Launch acceptance: proof before families rely on it',s['H1x'])]
    for i,g in enumerate(platform['gates'],1): st.append(P(str(i)+'. '+g,s['Bodyx']))
    sc=platform['separate_costs']
    st += [P('Six support hours per month is lean. Agree response targets, an incident owner, escalation pricing and changes outside scope; this allowance does not buy round-the-clock staffing.',s['Bodyx']),P(f"Separately included in the full budget: curriculum/clinical review {whole(sc['curriculum_clinical'])}; finite pilot content {whole(sc['pilot_content'])}; pilot-year creative oversight {whole(sc['creative_oversight'])} (one-time); devices {whole(sc['devices'])}; local marketing {whole(k['marketing'])}. These are not additional to the total model. The {whole(k['gen_cap'])} generation cap is not a full 12-episode, seven-minute season. National rollout, bulk tablets and open-ended child AI are excluded.",s['Bodyx']),P('Budget sufficiency and repayment are separate decisions. '+('The platform allowance is already inside the totals the operating margin covers; it does not by itself establish repayment capacity.' if k['margin']>0 else 'The current tuition case still has an operating deficit; platform delivery does not fix it.'),s['Bodyx'])]
    st += [PageBreak(),P('6. Sensitivity: price and occupancy',s['H1x']),P(f"Price and occupancy must be tested together. The locked-in rate is {whole(k['weekly'])}/week ({whole(k['tuition'])}/month); the higher prices below are illustrative scenario calculations, not market tuition claims and not signed demand.",s['Bodyx'])]
    sens=d['sensitivity']; rows=[['Children','Tuition / month','Annual receipts','Operating margin*']]
    for x in sens: rows.append([str(x['children']),money(x['tuition']),money(x['receipts']),money(x['annual_operating_margin'])])
    below=[x['children'] for x in sens if x['tuition']==k['tuition'] and x['annual_operating_margin']<0]
    tail=(f" At the locked-in rate the model is positive at {cap} children ({money(k['margin'])})"+(f" and negative at {', '.join(map(str,below))} children." if below else '.') if k['margin']>0 else f" At the locked-in rate the model remains negative at {cap} children.")
    st += [priced_table(rows,[.9*inch,1.35*inch,1.55*inch,1.55*inch],s),Spacer(1,.12*inch),P('*Before building payment, investor debt and profit tax. A positive scenario is not a financing commitment.'+tail+' A lender-ready plan needs signed enrollment, verified costs and a positive recurring margin with coverage after building payments.',s['Bodyx']),P('Stress case with no tuition receipts: '+money(d['funding']['zero_receipts_before_financing'])+' before mortgage and financing. This is a planning boundary, not a recommended raise.',s['Bodyx'])]
    st += [PageBreak(),P('7. Gates, evidence and blind spots',s['H1x']),P('Funding should release against evidence. Each gate converts a claim into something an investor can inspect.',s['Bodyx'])]
    gates=[['Gate','Evidence required before release'],['Scope','Signed age roster, room capacity, hours, current staff and payroll'],['Revenue','Signed enrollment at the locked-in rate, discounts, enrollment demand and collection history'],['Building',f"{whole(k['refinance'])} purpose, lender payoff/payment statement, points and closing terms"],['Product','Working family/child records, consent, billing, role isolation, private files and restore'],['Safety','Educator and clinical review, approved content, state-required training and insurance'],['Security','Independent manual test, retest letter, backup/restore and iPad/browser checks'],['Economics','Three months actual receipts and costs; positive ongoing cash before debt service'],['Rights','Creator contracts, deliverables, payments and character/video rights reconciled']]
    st += [priced_table(gates,[1.2*inch,5.25*inch],s),Spacer(1,.12*inch),P('Known exclusions and unknowns: mortgage payment, lender fees, past creator fees, actual food/utility/insurance quotes, current tax treatment, signed enrollment, state approval/accreditation, national expansion receipts and season production. They are excluded or labeled unknown; they are not silently zero.',s['Bodyx'])]
    st += [PageBreak(),P('8. Source and review notes',s['H1x']),P(f"This current pilot package (model {k['version']}, prepared {long_date(k['prepared'])}) is intentionally narrower than the historical expanded plan. It preserves the substantive operating direction while aligning the financial story to one center and the owner-confirmed staffing and tuition.",s['Bodyx'])]
    src=[['Evidence area','Reference'],['Child-care ratios','Missouri 5 CSR 25-500 rules: https://www.sos.mo.gov/CMSImages/AdRules/csr/current/5csr/5c25-500.pdf'],['Local wage benchmark','O*NET Missouri preschool teachers: https://www.onetonline.org/link/localwages/25-2011.00?st=MO'],['Payroll formulas','IRS Publication 15: https://www.irs.gov/publications/p15'],['Missouri unemployment','Missouri Department of Labor: https://labor.mo.gov/des/employers/tax-rates'],['Digital cost evidence',SITE+'Digital/cost-explorer.html'],['Complete line items',k['csv_url']],['Monthly cash schedule',SITE+'costs/'+k['cash_csv']]]
    st += [priced_table(src,[1.55*inch,4.9*inch],s),Spacer(1,.2*inch),P('Prepared from the current pilot-budget.json and current pilot business-plan markdown. Amounts are planning estimates until replaced by signed statements, quotes or invoices. This document does not offer securities, guarantee returns or represent lender approval.',s['Smallx'])]
    doc.build(st); return path

def build_one(d):
    k=facts(d); cap=k['cap']; f=d['funding']
    s=styles(); path=OUT/'Futures_Friends_CURRENT_Pilot_One_Sheet.pdf'; doc=NumberedDoc(str(path),'Futures Friends Current Pilot One Sheet',one=True)
    st=[P('FUTURES FRIENDS',s['Kicker']),P(f'{cap}-child pilot | investment overview',s['Cover']),P(f"One owned Independence, Missouri center • ages {k['ages']} • {cap} children, all-day care • 12 months • first-month checkpoint • model {k['version']}, {long_date(k['prepared'])}",s['Bodyx']),metric_grid(d,s,k),Spacer(1,.14*inch)]
    repay=(f"At the locked-in rate, year-two operating margin is {money(k['margin'])} before building/debt, with the owner as unpaid director. Break-even realized tuition is {money(k['breakeven'])} per child/month (about {whole(round(k['breakeven_week']))}/week). "+('Positive before building payments and debt; the building payment and lender terms are unknown, so borrowing capacity is not established.' if k['margin']>0 else 'The current case does not support borrowing.'))
    rows=[['What the investor needs to know','Current answer'],
          ['Purpose',f'Prove the platform, curriculum, characters, family workflows and center operations with one real {cap}-child pilot before Phase 2 expansion.'],
          ['Team',f"Owner serves as director, unpaid (market director about {money(k['director_ref'])} all-in, excluded). {k['full_time']} full-time caregivers and {k['part_time']} part-time relief floater, all at {k['rate']}/hour, no employer health benefit. {k['floor']} caregivers on the floor in {k['groups']} groups of up to {k['max_group']} (Missouri 1:10, valid with no more than four 2-year-olds per group). No food worker, no paid substitutes. Wages {money(k['wages'])}. "+d['staffing'].get('hiring_note','')+' Extra coverage: owner-director and head of administration, no added payroll.'],
          ['Recurring cost',money(d['totals']['recurring'])+' per year before building payments; this continues after year one. '+budgets_sentence(k)],
          ['Platform delivery',money(d['platform']['first_year'])+' Year 1: '+money(d['platform']['completion'])+' completion; '+money(d['platform']['assurance_one_time'])+' one-time assurance; '+money(d['platform']['recurring'])+' annual service. Reusable-code audit, fixed-scope quote and working acceptance required.'],
          ['One-time / contingency',money(d['totals']['one_time'])+' one-time; '+money(d['totals']['contingency'])+' contingency (15% of one-time). One-month cash floor: '+money(f['cash_floor'])+'.'],
          ['Building',f"Owner-specified {whole(k['refinance'])} refinance-enabling need. Payoff, closing costs, lender terms and new payment are unknown."],
          ['Revenue',f"Owner-confirmed locked-in {whole(k['weekly'])}/week per child ({whole(k['tuition'])}/month via 52/12), {k['collection']*100:.0f}% collection. {cap} full-year places collect {money(k['receipts'])} before discounts. Full enrollment from month {k['full_month']}"+(f"; first cash-positive month {k['positive_month']}." if k['positive_month'] else '.')],
          ['Repayment reality',repay],
          ['Funding estimate',money(f['request_before_financing'])+f" = {whole(k['refinance'])} refinance need + {money(f['peak_deficit'])} peak modeled deficit + contingency + one-month floor. Cost estimate only; not a financeable loan ask."],
          ['Payback timing',f"{money(d['totals']['one_time'])} one-time (months 1–{max(c['month'] for c in d['cash'] if c['one_time']>0)}) vs {money(d['totals']['recurring'])}/year recurring. Net cash positive from month {d['metrics'].get('first_cash_positive_month')}; cumulative pilot cash positive in month {d['metrics'].get('cumulative_cash_positive_month')} at the month-12 rate, before building payments and debt."],
          ['Terms','No permanent equity. Debt service only from cash after recurring operations and the actual building payment; lender rate, term, collateral and guarantees require an offer.'],
          ['Deferred','National rollout, full animated season, bulk family tablets and unsigned licensing income are Phase 2.']]
    st += [priced_table(rows,[1.55*inch,4.9*inch],s),Spacer(1,.1*inch),P(f"<b>Investor decision:</b> first verify enrollment, licensed age/room capacity, payroll, bills, insurance and the building statement. Then release against accepted product, safety, security and cash gates. The digital cost explorer and {k['lines']}-line CSV expose every priced row:",s['Smallx']),P(f"<link href=\"{SITE}Digital/cost-explorer.html\" color=\"#286FA6\">Digital cost explorer</link>  •  <link href=\"{SITE}Digital/pilot-plan.html#platform\" color=\"#286FA6\">Platform scope and acceptance</link>  •  <link href=\"{k['csv_url']}\" color=\"#286FA6\">{k['lines']}-line itemized CSV</link>  •  <link href=\"{SITE}Futures_Friends_CURRENT_Pilot_Business_Plan.pdf\" color=\"#286FA6\">Full current pilot plan</link>",s['Smallx']),P('No profit, repayment or lender approval is promised. All figures are planning estimates until replaced by signed evidence.',s['Smallx'])]
    doc.build(st); return path

if __name__=='__main__':
    d=json.loads(DATA.read_text()); k=facts(d)
    FOOTER=f"FUTURES FRIENDS  |  CURRENT {k['cap']}-CHILD PILOT  |  MODEL {k['version'].upper()}  |  {long_date(k['prepared'],upper=True)}"
    plan=build_business(d); one=build_one(d)
    # Ghostscript recompression (as in 138ae45d: images re-encoded as JPEG at full resolution; text and layout unchanged)
    import shutil, subprocess
    if shutil.which('gs'):
        tmp=plan.with_suffix('.gs.pdf')
        subprocess.run(['gs','-q','-dNOPAUSE','-dBATCH','-sDEVICE=pdfwrite','-dPDFSETTINGS=/default','-dCompatibilityLevel=1.6','-sOutputFile='+str(tmp),str(plan)],check=True)
        tmp.replace(plan)
    else: print('gs not found: business plan left uncompressed')
    # the published download aliases are byte-identical copies (publication-manifest.json download_aliases)
    for alias,src in [('01_Investor_Business_Plan.pdf',plan),('06_Financial_Reconciliation.pdf',plan),('05_Investor_One_Sheet.pdf',one)]:
        shutil.copyfile(src,OUT/alias)
    print(plan); print(one)
