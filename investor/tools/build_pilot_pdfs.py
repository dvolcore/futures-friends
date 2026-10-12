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
        canv.drawString(.57*inch,.27*inch,'FUTURES FRIENDS  |  CURRENT 40-CHILD PILOT  |  11 OCTOBER 2026')
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

def P(text, st): return Paragraph(str(text).replace('&','&amp;'), st)
def table(data, widths, header=True, font=7.2):
    t=Table(data,colWidths=widths,repeatRows=1 if header else 0,hAlign='LEFT')
    cmd=[('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('GRID',(0,0),(-1,-1),.25,colors.HexColor('#D4E0E8'))]
    if header: cmd += [('BACKGROUND',(0,0),(-1,0),NAVY),('TEXTCOLOR',(0,0),(-1,0),colors.white)]
    for r in range(1 if header else 0,len(data)):
        if r%2: cmd.append(('BACKGROUND',(0,r),(-1,r),PALE))
    t.setStyle(TableStyle(cmd)); return t

def priced_table(rows, widths, s):
    return table([[P(x, s['TableHead'] if i == 0 else s['TableBody']) for x in row] for i, row in enumerate(rows)], widths)

def metric_grid(d,s):
    vals=[(money(d['funding']['request_before_financing']),'COST ESTIMATE BEFORE FINANCING'),(money(d['totals']['gross_first_year']),'YEAR 1 WITH CONTINGENCY'),(money(d['totals']['recurring']),'ANNUAL RECURRING'),(money(d['metrics']['year2_margin']),'YEAR 2 MARGIN AT $910')]
    cells=[]
    for v,l in vals: cells.append([P(v,s['Metric']),P(l,s['MetricLabel'])])
    t=Table([cells],colWidths=[1.70*inch]*4,rowHeights=[.62*inch])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#C9DCE8')),('INNERGRID',(0,0),(-1,-1),.5,colors.white),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),8)])); return t

def build_business(d):
    s=styles(); path=OUT/'Futures_Friends_CURRENT_Pilot_Business_Plan.pdf'; doc=NumberedDoc(str(path),'Futures Friends Current Pilot Business Plan')
    st=[]
    logo=ASSETS/'ff-wordmark.webp'
    if logo.exists(): st += [Image(str(logo),width=2.15*inch,height=.48*inch),Spacer(1,.34*inch)]
    st += [P('CURRENT PILOT BUSINESS PLAN',s['Kicker']),P('A measured first center, built to earn the right to expand.',s['Cover']),P('One owned location in Independence, Missouri | 40 children ages 2–5 | 12 months | first-month checkpoint',s['Bodyx']),Spacer(1,.1*inch)]
    if (ASSETS/'keyart.webp').exists(): st.append(Image(str(ASSETS/'keyart.webp'),width=6.25*inch,height=2.05*inch,kind='proportional'))
    st += [Spacer(1,.18*inch),P('Futures Friends joins Booker, Lumi, Zuri and Bop to early literacy, movement, nutrition, belonging and family routines. This pilot reuses the website, CRM, ATS, store, characters and learning materials while finishing the secure family and child workflows required for one real center.',s['Bodyx']),P('<b>Decision posture:</b> This is an itemized cost estimate, not a financeable loan recommendation. Historical $910/month tuition does not cover the modeled recurring cost. Building payment, lender terms, actual liability and past creator compensation are unresolved.',s['Bodyx'])]
    st += [PageBreak(),P('1. The investment case',s['H1x']),P('The pilot is designed to answer operational questions with real families and real cash records before national rollout. Expansion is a Phase 2 decision, not part of this ask.',s['Bodyx']),metric_grid(d,s),Spacer(1,.18*inch)]
    snap=[['Decision item','Current model','What must be verified'],['Center','Owned Independence, MO; ages 2–5; 40-place ceiling','Licensed capacity, rooms, age mix and open hours'],['Funding','Cost estimate before financing '+money(d['funding']['request_before_financing']),'Do not call this a loan ask until economics are positive'],['Building','Owner-specified $140,000 refinance-enabling need','Payoff statement, closing costs, points and new payment'],['Revenue','Historical $910/month; 96% collection','Signed tuition, discounts, demand and actual collections'],['Debt','Cash after recurring operations and building payment','Lender offer, coverage, collateral and guarantees']]
    st += [priced_table(snap,[1.25*inch,2.25*inch,2.75*inch],s),Spacer(1,.1*inch),P('At 40 children on the historical price, annual receipts are '+money(d['metrics']['full_enrollment_receipts'])+' and year-two operating margin is '+money(d['metrics']['year2_margin'])+' before the building payment. The model therefore surfaces a required pricing or cost reset instead of presenting borrowed cash as profit.',s['Bodyx'])]
    st += [PageBreak(),P('2. Staffing and coverage',s['H1x']),P('The roster has two full-time adults. The rest are individually costed part-time shifts, relief, food service and substitutes. The names are a planning roster; they are not twelve simultaneous hires.',s['Bodyx'])]
    people=[x for x in d['lines'] if x.get('category')=='Staff wages']; rows=[['Person','Hours/year','Rate','Annual wages','Shift / role']]
    for x in people: rows.append([x['item'],f"{x['quantity']:,.0f}",money(x['rate']),money(x['annual']),x.get('notes','')[:110]])
    st += [priced_table(rows,[1.75*inch,.7*inch,.62*inch,.85*inch,2.05*inch],s),Spacer(1,.1*inch),P('Total planning wages: '+money(d['staffing']['wages'])+'. The assumed schedule keeps four adults on the floor, subject to the approved age mix and room rules. If the actual mix requires a fifth adult, the register adds at least 2,500 service hours at $20/hour before relief, taxes and insurance. The food worker does not count while preparing food; the director counts only while assigned to the room.',s['Bodyx']),P('Employer taxes, workers compensation, optional benefits, background checks, CPR and training are separate line items. No blanket unemployment reserve is hidden in the model.',s['Smallx'])]
    st += [PageBreak(),P('3. Cash, enrollment and repayment',s['H1x']),P('The first-year cash schedule ramps enrollment from 30 to 40 children. One-time launch spending is weighted toward the first month; the schedule shows when cash is needed rather than treating the full annual total as a monthly payment.',s['Bodyx'])]
    cash=d['cash']; rows=[['Month','Children','Receipts','Recurring','One-time','Net','Cumulative']]
    for x in cash: rows.append([str(x['month']),str(x['children']),money(x['receipts']),money(x['recurring']),money(x['one_time']),money(x['net']),money(x['cumulative'])])
    st += [priced_table(rows,[.55*inch,.7*inch,1.0*inch,1.0*inch,1.0*inch,1.0*inch,1.15*inch],s),Spacer(1,.12*inch),P('<b>Repayment rule:</b> monthly debt service is considered only after recurring operations and the actual building payment. A 1.25 coverage screen is a planning test, not a lender promise. The present case has no positive debt capacity because the mortgage is unknown and operating margin is negative.',s['Bodyx']),P('Break-even realized tuition: '+money(d['metrics']['breakeven_tuition'])+' per child per month before building/debt. This does not prove a profitable enrollment count; tuition, costs, licensed capacity and demand still require verification.',s['Bodyx'])]
    st += [PageBreak(),P('4. Every priced category',s['H1x']),P('Each row in the digital register carries an item, quantity, rate, formula, bucket, evidence basis and source URL where one exists. Published prices, tax formulas and quote-required allowances remain distinguished.',s['Bodyx'])]
    cats={}
    for x in d['lines']: cats.setdefault(x['category'],0); cats[x['category']]+=x['annual']
    rows=[['Category','Annual total','Register evidence']]
    for k,v in sorted(cats.items(),key=lambda z:-z[1]): rows.append([k,money(v),'Itemized rows in CSV / JSON'])
    st += [priced_table(rows,[2.6*inch,1.25*inch,2.45*inch],s),Spacer(1,.1*inch),P('The complete 311-line register is available at <link href="https://dvolcore.github.io/futures-friends/investor/costs/Pilot_40_Children_Itemized.csv" color="#286FA6">Pilot_40_Children_Itemized.csv</link> and <link href="https://dvolcore.github.io/futures-friends/investor/Digital/cost-explorer.html" color="#286FA6">the digital cost explorer</link>. The PDF is a decision brief; the register is the audit trail.',s['Bodyx'])]
    platform=d['platform']
    st += [PageBreak(),P('5. Platform delivery and acceptance',s['H1x']),P('The pilot reuses the existing website, CRM, ATS, store and character library. This is a completion allowance for one center and 40 children; it is not the replacement price of everything already created.',s['Bodyx'])]
    summary=[['Platform allocation','Amount / timing'],['Completion: 380 hours at $150',money(platform['completion'])+' one-time'],['Independent test / retest and counsel',money(platform['assurance_one_time'])+' one-time'],['Total one-time platform work',money(platform['one_time'])],['Support, privacy maintenance and hosting',money(platform['recurring'])+' annually; '+money(platform['monthly'])+' monthly average'],['Year-1 platform allowance',money(platform['first_year'])],['Platform contingency already included',money(platform['contingency_included'])+' within overall contingency; do not add twice']]
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
    st += [P('Six support hours per month is lean. Agree response targets, an incident owner, escalation pricing and changes outside scope; this allowance does not buy round-the-clock staffing.',s['Bodyx']),P('Separately included in the full budget: curriculum/clinical review $38,600; finite pilot content $25,740; annual creative oversight $14,400; devices $2,580; local marketing $11,400. These are not additional to the total model. The $3,000 generation cap is not a full 12-episode, seven-minute season. National rollout, bulk tablets and open-ended child AI are excluded.',s['Bodyx']),P('Budget sufficiency and repayment are separate decisions. The current historical-tuition case still has an operating deficit; platform delivery does not fix it.',s['Bodyx'])]
    st += [PageBreak(),P('6. Sensitivity and the economic reset',s['H1x']),P('Price and occupancy must be tested together. These are scenario calculations, not market tuition claims and not signed demand.',s['Bodyx'])]
    sens=d['sensitivity']; rows=[['Children','Tuition / month','Annual receipts','Operating margin*']]
    for x in sens: rows.append([str(x['children']),money(x['tuition']),money(x['receipts']),money(x['annual_operating_margin'])])
    st += [priced_table(rows,[.9*inch,1.35*inch,1.55*inch,1.55*inch],s),Spacer(1,.12*inch),P('*Before building payment, investor debt and profit tax. A positive scenario is not a financing commitment. The current historical $910 case remains negative at 40 children. A lender-ready plan needs signed pricing, verified costs and a positive recurring margin with coverage after building payments.',s['Bodyx']),P('Stress case with no tuition receipts: '+money(d['funding']['zero_receipts_before_financing'])+' before mortgage and financing. This is a planning boundary, not a recommended raise.',s['Bodyx'])]
    st += [PageBreak(),P('7. Gates, evidence and blind spots',s['H1x']),P('Funding should release against evidence. Each gate converts a claim into something an investor can inspect.',s['Bodyx'])]
    gates=[['Gate','Evidence required before release'],['Scope','Signed age roster, room capacity, hours, current staff and payroll'],['Revenue','Signed tuition schedule, discounts, enrollment demand and collection history'],['Building','$140,000 purpose, lender payoff/payment statement, points and closing terms'],['Product','Working family/child records, consent, billing, role isolation, private files and restore'],['Safety','Educator and clinical review, approved content, state-required training and insurance'],['Security','Independent manual test, retest letter, backup/restore and iPad/browser checks'],['Economics','Three months actual receipts and costs; positive ongoing cash before debt service'],['Rights','Creator contracts, deliverables, payments and character/video rights reconciled']]
    st += [priced_table(gates,[1.2*inch,5.25*inch],s),Spacer(1,.12*inch),P('Known exclusions and unknowns: mortgage payment, lender fees, past creator fees, actual food/utility/insurance quotes, current tax treatment, signed tuition, state approval/accreditation, national expansion receipts and season production. They are excluded or labeled unknown; they are not silently zero.',s['Bodyx'])]
    st += [PageBreak(),P('8. Source and review notes',s['H1x']),P('This current pilot package is intentionally narrower than the historical expanded plan. It preserves the substantive operating direction while aligning the financial story to one center and the user-approved staffing structure.',s['Bodyx'])]
    src=[['Evidence area','Reference'],['Child-care ratios','Missouri 5 CSR 25-500 rules: https://www.sos.mo.gov/CMSImages/AdRules/csr/current/5csr/5c25-500.pdf'],['Local wage benchmark','O*NET Missouri preschool teachers: https://www.onetonline.org/link/localwages/25-2011.00?st=MO'],['Payroll formulas','IRS Publication 15: https://www.irs.gov/publications/p15'],['Missouri unemployment','Missouri Department of Labor: https://labor.mo.gov/des/employers/tax-rates'],['Digital cost evidence','https://dvolcore.github.io/futures-friends/investor/Digital/cost-explorer.html'],['Complete line items','https://dvolcore.github.io/futures-friends/investor/costs/Pilot_40_Children_Itemized.csv']]
    st += [priced_table(src,[1.55*inch,4.9*inch],s),Spacer(1,.2*inch),P('Prepared from the current pilot-budget.json and current pilot business-plan markdown. Amounts are planning estimates until replaced by signed statements, quotes or invoices. This document does not offer securities, guarantee returns or represent lender approval.',s['Smallx'])]
    doc.build(st); return path

def build_one(d):
    s=styles(); path=OUT/'Futures_Friends_CURRENT_Pilot_One_Sheet.pdf'; doc=NumberedDoc(str(path),'Futures Friends Current Pilot One Sheet',one=True)
    st=[P('FUTURES FRIENDS',s['Kicker']),P('40-child pilot | investment overview',s['Cover']),P('One owned Independence, Missouri center • ages 2–5 • 12 months • first-month checkpoint',s['Bodyx']),metric_grid(d,s),Spacer(1,.14*inch)]
    rows=[['What the investor needs to know','Current answer'],['Purpose','Prove the platform, curriculum, characters, family workflows and center operations with one real 40-child pilot before Phase 2 expansion.'],['Team','Two full-time adults; individual part-time classroom shifts, relief, food service and substitutes. Four floor adults is conditional on the approved age mix and rooms.'],['Recurring cost',money(d['totals']['recurring'])+' per year before building payments; this continues after year one.'],['Platform delivery',money(d['platform']['first_year'])+' Year 1: '+money(d['platform']['completion'])+' completion; '+money(d['platform']['assurance_one_time'])+' one-time assurance; '+money(d['platform']['recurring'])+' annual service. Reusable-code audit, fixed-scope quote and working acceptance required.'],['One-time / contingency',money(d['totals']['one_time'])+' one-time; '+money(d['totals']['contingency'])+' contingency (15% of one-time). One-month cash floor: $39,755.50.'],['Building','Owner-specified $140,000 refinance-enabling need. Payoff, closing costs, lender terms and new payment are unknown. The old $700,000 placeholder is removed.'],['Revenue test','Historical $910/month, 96% collection, not a signed current price. Forty full-year places produce '+money(d['metrics']['full_enrollment_receipts'])+' in this illustrative case.'],['Repayment reality','At that historical price, year-two operating margin is '+money(d['metrics']['year2_margin'])+' before building/debt. Break-even realized tuition is '+money(d['metrics']['breakeven_tuition'])+' per child/month before those payments.'],['Funding estimate',money(d['funding']['request_before_financing'])+' = $140,000 refinance need + peak modeled deficit + contingency + one-month floor. Cost estimate only; not a financeable loan ask.'],['Terms','No permanent equity. Debt service only from cash after recurring operations and the actual building payment; lender rate, term, collateral and guarantees require an offer.'],['Deferred','National rollout, full animated season, bulk family tablets and unsigned licensing income are Phase 2.']]
    st += [priced_table(rows,[1.55*inch,4.9*inch],s),Spacer(1,.1*inch),P('<b>Investor decision:</b> first verify pricing, licensed age/room capacity, payroll, bills, insurance and the building statement. Then release against accepted product, safety, security and cash gates. The digital cost explorer and 311-line CSV expose every priced row:',s['Smallx']),P('<link href="https://dvolcore.github.io/futures-friends/investor/Digital/cost-explorer.html" color="#286FA6">Digital cost explorer</link>  •  <link href="https://dvolcore.github.io/futures-friends/investor/Digital/pilot-plan.html#platform" color="#286FA6">Platform scope and acceptance</link>  •  <link href="https://dvolcore.github.io/futures-friends/investor/costs/Pilot_40_Children_Itemized.csv" color="#286FA6">311-line itemized CSV</link>  •  <link href="https://dvolcore.github.io/futures-friends/investor/Futures_Friends_CURRENT_Pilot_Business_Plan.pdf" color="#286FA6">Full current pilot plan</link>',s['Smallx']),P('No profit, repayment or lender approval is promised. All figures are planning estimates until replaced by signed evidence.',s['Smallx'])]
    doc.build(st); return path

if __name__=='__main__':
    d=json.loads(DATA.read_text()); print(build_business(d)); print(build_one(d))
