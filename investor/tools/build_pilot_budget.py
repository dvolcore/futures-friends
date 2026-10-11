"""Reproducible planning estimate, never a supplier quote or verified operating ledger."""
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import json, csv
ROOT=Path(__file__).resolve().parents[1]
D=lambda v:Decimal(str(v))
M=lambda v:D(v).quantize(D('.01'),rounding=ROUND_HALF_UP)
lines=[]
sources={
'wage':('KC preschool wage benchmark; chosen rate is a planning offer','https://www.onetonline.org/link/localwages/25-2011.00?st=MO'),
'fica':('Statutory employer tax','https://www.irs.gov/taxtopics/tc751'),
'suta':('MO new-employer planning tax; replace with actual rate letter','https://labor.mo.gov/des/employers/tax-rates'),
'futa':('Conditional full-credit FUTA rate; entity eligibility unresolved','https://www.irs.gov/publications/p15'),
'gusto':('Published Plus plan price; taxes separate','https://gusto.com/product/pricing'),
'supa':('Published Pro starting price; usage overages separate','https://supabase.com/pricing'),
'do':('Chosen hosting configuration allowance, not a fixed product quote','https://www.digitalocean.com/pricing'),
'backup':('Published daily backup percentage applied to compute allowance','https://docs.digitalocean.com/products/backups/details/pricing/'),
'resend':('Published subscription price; check selected plan at purchase','https://resend.com/pricing'),
'qb':('List-price planning subscription; no promotional discount','https://quickbooks.intuit.com/online/'),
'stripe':('Published payment processing schedule','https://stripe.com/pricing'),
'edu':('Published individual consultant benchmark; engagement not quoted','https://www.drjenmata.com/services-pricing'),
'fcsr':('FCSR published fee; does not cover all required checks','https://health.mo.gov/providers/family-care-safety-registry/how-register-family-care-safety-registry'),
'permit':('Published city childcare permit category, applicability confirm','https://www.independencemo.gov/government/city-departments/health/health-inspection-division/childcare-providers-permitting'),
'allow':('Planning allowance — written quote or invoice required',''),
'owner':('Owner-provided funding requirement — not a lender payoff quote',''),
'risk':('Planning reserve policy — cash provision, not vendor expense',''),
}
def add(cat,item,unit,qty,rate,bucket='recurring',src='allow',notes=''):
 basis,url=sources[src]
 lines.append(dict(id=f'P{len(lines)+1:03}',category=cat,item=item,unit=unit,quantity=float(D(qty)),rate=float(D(rate)),annual=float(M(D(qty)*D(rate))),bucket=bucket,basis=basis,url=url,notes=notes))
# Two full-time adults; individual short shifts maintain four simultaneous floor adults.
staff=[('Full-time director',2080,24),('Full-time teacher 1',2080,20),('Part-time teacher 2 — 7am–noon',1300,20),('Part-time teacher 3 — 7am–noon',1300,20),('Part-time teacher 4 — noon–5pm',1300,20),('Part-time teacher 5 — noon–5pm',1300,20),('Part-time teacher 6 — 3pm–5pm',520,20),('Part-time teacher 7 — 3pm–5pm',520,20),('Part-time break/admin floater',1040,20),('Part-time food worker',1040,19),('Substitute 1',320,20),('Substitute 2',320,20)]
for name,hours,rate in staff:
 wage=M(D(hours)*D(rate))
 note='Total planning roster, not all new hires. 52 paid weeks include closure/training allowance; actual roster and hours must replace estimates.'
 if 'director' in name:note+=' Qualified director counts only while assigned to the room; 2 hours/day administrative relief covered by floater.'
 if 'food' in name:note+=' Food preparation cannot count as classroom supervision.'
 add('Staff wages',name,'paid hours',hours,rate,src='wage',notes=note)
 add('Employer taxes',name+' — Social Security','taxable wages',wage,'.062',src='fica')
 add('Employer taxes',name+' — Medicare','taxable wages',wage,'.0145',src='fica')
 add('Employer taxes',name+' — Missouri unemployment','taxable wage base',min(wage,D(9000)),'.02376',src='suta',notes='Actual experience rate/entity treatment controls. No separate unemployment reserve.')
 add('Employer taxes',name+' — FUTA','taxable wage base',min(wage,D(7000)),'.006',src='futa',notes='Conditional full-credit taxable-employer assumption; accountant must confirm.')
 add('Staff insurance',name+' — workers compensation','covered wages',wage,'.02',notes='2% unquoted classification allowance; broker quote required.')
 if name.startswith('Full-time'):
  add('Staff benefits',name+' — employer medical contribution','months',12,300,notes='Optional employer contribution allowance, not an insurance quote.')
  add('Staff benefits',name+' — retirement contribution','eligible wages',wage,'.03',notes='Optional 3% policy; eligibility and plan terms unresolved.')
for name,_,_ in staff:
 add('Staff readiness',name+' — FCSR registration','registration',1,'16.57','one_time','fcsr','Reuse valid existing checks where permitted.')
 add('Staff readiness',name+' — other background checks','check allocation',1,'58.43','one_time',notes='Unquoted fingerprint/registry balance; verify requirements.')
 add('Staff readiness',name+' — CPR/first aid','seat',1,85,'one_time')
 add('Staff readiness',name+' — annual training','seat',1,150,notes='Paid training time included in wages; confirm approved provider.')
 add('Staff readiness',name+' — uniform','shirts',3,25,'one_time')
add('Administration','Payroll Plus base','months',12,80,src='gusto')
add('Administration','Payroll Plus employee fee','person-months',144,12,src='gusto',notes='12 individually listed adults; adjust to actual billed roster.')
add('Administration','Bookkeeping service','months',12,300)
add('Administration','Tax preparation','filing',1,2500)
add('Administration','QuickBooks subscription','months',12,38,src='qb')
add('Administration','Operating bank fees','months',12,25)
add('Administration','Business phone','months',12,40)
add('Administration','Postage','pieces',120,'.8')
add('Administration','Notary','documents',10,10)
add('Administration','Annual business license allowance','renewal',1,250,notes='City gross-receipts calculation and entity exemption unresolved.')
add('Administration','City childcare permit','year',1,250,src='permit')
add('Administration','Food permit allowance','year',1,600,notes='Risk class/exemption must be confirmed; do not pay twice if included in existing license.')
add('Administration','Food manager training allowance','seat',1,30,'one_time')
add('Administration','Food handler permit allowance','seats',2,25,'one_time')
# 40 children, 250 meal-service days. Quoted menus may alter individual quantities.
for item,rate in [('Milk', '.50'),('Fruit','.60'),('Vegetables','.50'),('Protein','.90'),('Grains','.45'),('Allergy substitutes','.15'),('Special diets','.10'),('Food disposables','.15'),('Food waste allowance','.16')]:
 add('Food and nutrition',item,'child service-days',10000,rate,notes='40 × 250 days; per-category purchasing allowance, not a supplier quote. No food-program reimbursement assumed.')
for item,qty,rate in [('Food storage supplies',24,15),('Kitchen service',2,300),('Refrigerator service',2,200),('Freezer service',2,200),('Dishwashing supplies',12,35),('Kitchen gloves',24,12),('Aprons',6,20)]:add('Food and nutrition',item,'units / service visits',qty,rate)
for item,rate in [('Electricity',600),('Natural gas',175),('Water/sewer',175),('Internet',120),('Staff mobile connectivity',80),('Waste collection',125),('Pest service',75),('Alarm monitoring',40)]:add('Building operations',item,'months',12,rate,notes='Existing bill required; owned facility, no rental deposit or lease rent included.')
for item,qty,rate in [('HVAC service',4,250),('Plumbing maintenance',4,200),('Electrical maintenance',2,250),('Snow service',8,150),('Lawn service',24,60),('Parking repairs',1,500),('Deep cleaning',4,400),('Property taxes',1,6000),('Building repair allocation',1,3000)]:add('Building operations',item,'visits / annual allowance',qty,rate,notes='Property tax bill, maintenance history and scope required; no major renovation assumed.')
for item,rate in [('General liability / abuse coverage allowance',5000),('Property insurance allowance',2000),('Umbrella liability allowance',1500),('Business interruption allowance',1200),('Cyber / technology professional liability allowance',3000)]:add('Insurance',item,'annual policy',1,rate,notes='Broker must confirm policy structure, exclusions and no overlap among coverages.')
for item,qty,rate in [('Sanitizer',12,30),('Paper towels',48,35),('Toilet paper',24,30),('Hand soap',24,18),('Laundry',12,50),('Tissues',48,2),('Cleaning wipes',60,4),('Trash bags',12,15),('Gloves/PPE',12,20)]:add('Cleaning and consumables',item,'packs / service-months',qty,rate)
for item,qty,rate in [('Mops',2,30),('Buckets',2,15),('Brooms',2,20),('Vacuum',1,200),('First aid kits',4,50),('CO detectors',4,35),('Smoke detectors',8,25),('Emergency lights',4,80),('Medication lockboxes',2,80)]:add('Safety and equipment',item,'units',qty,rate,'one_time',notes='Buy only after existing inventory inspection; conditional replacement allowance.')
for item,qty,rate in [('First aid refills',4,30),('Extinguisher service',6,25),('Incident forms',4,25),('Safety drill materials',4,50),('Visitor log supplies',4,20),('Sharps disposal',4,30),('Water inspection',1,250),('Indoor air check',1,500),('Playground inspection',1,750)]:add('Safety and equipment',item,'units / inspections',qty,rate)
add('Safety and equipment','Access-control repair allowance','allowance',1,300,'one_time')
add('Safety and equipment','Camera system repair allowance','allowance',1,300,'one_time',notes='No classroom child facial recognition or home-device camera use planned.')
# Reuse owned rooms. Only a small replacement allowance rather than outfitting a new center.
for item,qty,rate in [('Chair replacements',8,45),('Nap mat replacements',8,35),('Storage bin replacements',12,12),('Books',60,12),('Manipulatives',4,150),('Puzzles',20,15),('Music instruments',4,50),('Science materials',4,75)]:add('Classroom materials',item,'units',qty,rate,'one_time',notes='Conditional replenishment; inventory audit can remove unneeded purchases.')
for item,qty,rate in [('Pencils classroom pack',2,'39.99'),('Crayon classroom pack',2,'89.99'),('Marker classroom pack',2,'129.99'),('Construction paper',12,15),('Glue packs',6,'19.99'),('Scissors',44,3),('Paint',12,25),('Play dough',24,12),('Printer paper',12,8),('Laminating pouches',4,30),('Labels',12,10),('Whiteboard supplies',12,10),('Sensory supplies',12,50),('Pens',3,8),('Eraser packs',2,6),('Sharpeners',4,12),('Tape packs',2,'29.99'),('Staplers',2,15),('Staples',4,4),('Clips',4,3),('Binders',20,5),('Dividers',20,3),('Folders',100,'.5'),('Printing ink',12,'15.99')]:add('Classroom and office consumables',item,'packs / units',qty,rate,notes='Quantity and SKU planning allowance; written school-supply basket required. Cents show arithmetic, not quote accuracy.')
# Existing platform completion, not replacement valuation. Hours are bounded engineering estimates.
for item,h in [('Existing-build inventory and deployment acceptance',20),('Family/child authentication and guardian consent',40),('Existing CRM ATS store integration',25),('Curriculum work records and parent progress digest',60),('Finite character messages and QR routines',20),('Bilingual product review and fixes',25),('Role security private files and consent audit',65),('Backup restore monitoring deployment controls',40),('Accessibility iPad and browser verification',35),('UAT staff training onboarding and launch',50)]:add('Platform completion',item,'engineering hours',h,150,'one_time',notes='Incremental scope estimate, no vendor quote. Reuse current software; acceptance backlog and fixed-scope bids required. 380 hours total; scope must be confirmed by inspecting reusable code; inventory gate included.')
add('Platform assurance','Independent manual web/API penetration test with retest','engagement',1,12000,'one_time',notes='Planning allowance; multi-role child-data scope and retest must be quoted. Not an automated scan.')
add('Platform assurance','Privacy counsel consent contracts and retention review','legal hours',24,350,'one_time',notes='COPPA applicability/consent, family home use, vendors and records review; counsel opinion not included as a compliance certification.')
add('Platform assurance','Security/privacy maintenance review','hours',24,150)
add('Platform support','Technical maintenance and support','hours',72,150,notes='Six hours/month after completion, separate from build acceptance. Extra features require separate authorization.')
for item,qty,rate,src in [('DigitalOcean production compute',12,48,'do'),('DigitalOcean staging compute',12,24,'do'),('Object storage',12,5,'do'),('Daily compute backup',12,'21.6','backup'),('Supabase Pro',12,25,'supa'),('Transactional email',12,20,'resend')]:add('Hosting and software',item,'months',qty,rate,src=src)
for item,qty,rate in [('Independent encrypted backup storage',12,10),('Uptime monitoring',12,12),('Domain renewal',1,25),('Password manager',60,8),('Help desk subscription allowance',12,30),('SMS and registration allowance',12,25),('CDN/security plan allowance',12,25),('Cloud usage overage allowance',12,50),('School-owned tablets',8,200),('Tablet protective cases',8,30),('Charging station',1,120),('Device enrollment/setup',8,25)]:add('Hosting and software' if qty==12 or qty==60 or item=='Domain renewal' else 'Pilot devices',item,'months / seats / units',qty,rate,'one_time' if item.startswith(('School-owned','Tablet protective','Charging','Device enrollment')) else 'recurring',notes='Allowance; no family-device rental business or mass manufacturing in this pilot.')
add('Pilot devices','Device management allowance','device-months',120,'3.5',notes='Assumes ten-device minimum; quote exact plan and kiosk support for selected devices.')
TUITION=D(910); COLLECTION=D('.96')
def payment_fees(children,tuition=TUITION,collection=COLLECTION):
 transactions=D(children)*12*collection
 return M(transactions*(D('.95')*min(tuition*D('.008'),D(5))+D('.05')*(tuition*D('.029')+D('.30')))+transactions*tuition*D('.007'))
transactions=D(40)*12*COLLECTION
add('Payments','ACH processing — 95% collections','transactions',transactions*D('.95'),min(TUITION*D('.008'),D(5)),src='stripe',notes='Expected paid monthly transactions; fees vary with tuition and occupancy.')
add('Payments','Card processing — 5% collections','transactions',transactions*D('.05'),TUITION*D('.029')+D('.30'),src='stripe')
add('Payments','Recurring billing fee','collected dollars',D(40)*12*TUITION*COLLECTION,'.007',src='stripe',notes='Confirm whether existing billing avoids this fee; separate from processing.')
add('Payments','Refund/chargeback fee allowance','events',12,15)
add('Curriculum and clinical review','Initial curriculum completion / mapping','educator hours',120,125,'one_time','edu','Specific benchmark, not industry-wide average; child development approval required.')
add('Curriculum and clinical review','Staff curriculum implementation coaching','educator hours',24,125,'one_time','edu')
add('Curriculum and clinical review','Ongoing curriculum support','educator hours',48,125,src='edu')
add('Curriculum and clinical review','RN initial health/routine review','hours',16,125,'one_time')
add('Curriculum and clinical review','RN recurring consultation','hours',48,125,notes='Clinical consultant allowance; does not replace medical diagnosis or dietitian expertise.')
add('Curriculum and clinical review','Registered dietitian menu review','hours',12,150,'one_time')
add('Curriculum and clinical review','Native Spanish curriculum review','hours',40,75,'one_time')
add('Curriculum and clinical review','Native Spanish update review','hours',24,75)
add('Pilot content production','Ralph / creative production lead — finite pilot asset delivery','hours',120,100,'one_time',notes='Proposed forward creative fee, not repayment of past work; covers pilot clips/design reuse. Scope and rights agreement required.')
add('Pilot content production','Pilot scriptwriting and storyboards','hours',24,75,'one_time')
add('Pilot content production','Editing sound captions and exports','hours',60,75,'one_time')
add('Pilot content production','Education review of scripts','hours',12,125,'one_time','edu')
add('Pilot content production','Generation credits pilot spend cap','allowance',1,3000,'one_time',notes='Unattributed planning cap; does NOT promise twelve 7-minute episodes. Test accepted-minute yield before committing scope or credit purchases.')
add('Pilot content production','Voice/music licensing allowance','allowance',1,1500,'one_time')
add('Pilot content production','Creative software allowance','months',12,120,notes='Subscription basket quote needed; do not duplicate tools included in vendor fees.')
add('Pilot content support','Ralph / creative lead — pilot oversight and updates','hours',144,100,notes='12 hours/month forward support, separate from build labor; actual schedule and deliverables must be agreed. Past services excluded pending reconciliation.')
add('Local marketing','Paid local advertising','months',12,500,notes='Tested channel budget cap, not proven cost per enrollment. Pause/reallocate on conversion evidence.')
add('Local marketing','Campaign management and analytics','hours',18,100,notes='1.5 hours/month; distinct from creative production. No national sales team.')
add('Local marketing','Launch photography / approved brand asset refresh','engagement',1,2400,'one_time',notes='Use existing artwork; consent-backed real photos only. Quote scope.')
add('Local marketing','Tour materials and local signage','allowance',1,1200,'one_time')
add('Store pilot','Made-to-order sample merchandise','sample units',20,20,'one_time',notes='No warehouse, bulk stock or unsigned merchandise income. Fulfillment paid from sales; unit margin validated before accepting orders.')
add('Store pilot','Store fulfillment test shipments','test shipments',10,15,'one_time')
add('Refinance transaction','Appraisal allowance','engagement',1,3000,'one_time',notes='Lender quote needed; owner $140,000 is separate proceeds requirement, not verified debt balance.')
add('Refinance transaction','Title recording and lender closing allowance','allowance',1,2000,'one_time',notes='Origination points, taxes, payoff penalties and legal fees may be additional; unknown lender statement required.')
add('Refinance transaction','Refinance counsel allowance','hours',4,350,'one_time')
rec=M(sum(D(x['annual']) for x in lines if x['bucket']=='recurring')); once=M(sum(D(x['annual']) for x in lines if x['bucket']=='one_time'))
# Contingency applies to unquoted completion/launch risk, not another payroll tax.
cont=M(once*D('.15')); floor=M(rec/12); refi=D(140000)
pay=M(sum(D(x['annual']) for x in lines if x['category']=='Payments' and 'Refund' not in x['item']))
food=D('3.51')*40*250; fixed=M(rec-food-pay)
oneweights=[D('.45'),D('.25'),D('.15'),D('.10'),D('.05')]+[D(0)]*7
children=[30,34,36,38]+[40]*8
cash=[]; cumulative=D(0); remaining=once
for i,c in enumerate(children):
 operating=M(fixed/12+D(c)*250*D('3.51')/12+payment_fees(c)/12)
 o=M(once*oneweights[i]) if i<11 else remaining;remaining-=o
 receipts=M(D(c)*TUITION*COLLECTION); net=M(receipts-operating-o);cumulative+=net
 cash.append(dict(month=i+1,children=c,receipts=float(receipts),recurring=float(operating),one_time=float(o),net=float(net),cumulative=float(M(cumulative))))
peak=M(max([D(0)]+[-D(c['cumulative']) for c in cash])); revenue=M(D(40)*TUITION*12*COLLECTION);margin=M(revenue-rec)
def annual_margin(t,c=40):return M(D(c)*D(t)*12*COLLECTION-fixed-D(c)*250*D('3.51')-payment_fees(c,D(t)))
lo=D(0);hi=D(5000)
for _ in range(60):
 mid=(lo+hi)/2
 if annual_margin(mid)<0:lo=mid
 else:hi=mid
break_even=M(hi)
model=dict(meta=dict(title='Futures Friends | 40-child 12-month pilot',prepared='2026-10-11',version='pilot-40-v3',status='Conditional planning estimate; ongoing economics do not yet support borrowing',scope='One owned location, ages 2–5; first-month checkpoint; national expansion deferred.',line_count=len(lines)),totals=dict(recurring=float(rec),one_time=float(once),contingency=float(cont),gross_before_contingency=float(rec+once),gross_first_year=float(rec+once+cont),refinance=140000),lines=lines,cash=cash,assumptions=dict(tuition=910,tuition_basis='Historical v4.3 draft: $210/week converted using 52/12; current signed schedule unverified; sibling discounts can lower realized revenue',collection=.96,mortgage_payment=None,mortgage_status='UNKNOWN — excluded, not free',cash_ramp=children,service_days=250,open_hours=10,past_creator_fees='Excluded pending signed deliverables, payments and rights reconciliation'),funding=dict(peak_deficit=float(peak),cash_floor=float(floor),request_before_financing=float(M(refi+peak+cont+floor)),zero_receipts_before_financing=float(M(refi+rec+once+cont+floor)),financing_status='Cost estimate, not a financeable loan request. Negative ongoing margin; mortgage, debt, lender fees and past creator invoice unresolved.'),metrics=dict(year2_margin=float(margin),breakeven_tuition=float(break_even),full_enrollment_receipts=float(revenue)),recurring_components=dict(fixed_annual=float(fixed),variable_per_child_day=3.51,service_days=250,payment_annual=float(pay)),staffing=dict(full_time=2,people=12,wages=269680,coverage='Four simultaneous floor adults 7am–5pm, conditional age/room grouping; floater separately replaces admin and break coverage; food worker excluded.',schedule=[dict(time='7am–noon',people='Director + teacher 1 + teachers 2 and 3'),dict(time='noon–3pm',people='Director + teacher 1 + teachers 4 and 5'),dict(time='3pm–5pm',people='Teachers 4, 5, 6 and 7')]),sources_checked='2026-10-11 primary tax, wage and vendor references; allowances require written quotes')
model['sensitivity']=[dict(children=c,tuition=t,receipts=float(M(D(c)*D(t)*12*COLLECTION)),annual_operating_margin=float(annual_margin(t,c)),basis='Illustrative price test, not verified market tuition; building and debt excluded') for t in [910,1250,1300,1400] for c in [30,35,40]]
for path in ['costs/pilot-budget.json','Digital/model/pilot-budget.json']:(ROOT/path).write_text(json.dumps(model,indent=2)+'\n')
for filename,data in [('Pilot_40_Children_Itemized.csv',lines),('Pilot_40_Children_Monthly_Cash.csv',cash)]:
 with (ROOT/'costs'/filename).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(data[0]),lineterminator="\n");w.writeheader();w.writerows(data)
fmt=lambda v:('-' if D(v)<0 else '')+f'${abs(D(v)):,.2f}'
category={}
for l in lines:category[l['category']]=M(category.get(l['category'],0)+D(l['annual']))
body=f"""# Futures Friends — current 40-child pilot business and funding plan

Prepared October 11, 2026. One owned Independence, Missouri location, ages 2–5, twelve months of operations and a first-month checkpoint. This replaces the expanded $3,139,152.61 case and the discarded $700,000 refinance assumption. National rollout belongs to Phase 2.

## What the pilot proves
Futures Friends connects Booker, Lumi, Zuri and Bop to early literacy, movement, nutrition, belonging and family routines. Reuse the existing website, CRM, ATS, store, characters and learning materials. Complete parent/child access, curriculum records, approved character reminders and the operating controls needed for one center. Measure safe delivery, parent use, retention and actual cash margin before expanding.

## The funding calculation
| Item | Amount |
|---|---:|
| Annual recurring operating cost | {fmt(rec)} |
| One-time completion and launch | {fmt(once)} |
| First-year spend before contingency | {fmt(rec+once)} |
| First-year spend including contingency | {fmt(rec+once+cont)} |
| Contingency: 15% of one-time spend | {fmt(cont)} |
| Working capital floor: one operating month | {fmt(floor)} |
| Owner-specified funding enabling refinance | $140,000.00 |
| Peak pilot cash deficit after modeled tuition | {fmt(peak)} |
| Funding estimate before mortgage and financing | **{fmt(model['funding']['request_before_financing'])}** |

The estimate adds $140,000 + peak cumulative deficit + contingency + cash floor. One-time costs are already included in the cash deficit. Working capital and contingency are cash provisions, not additional vendor expenses. The $140,000 is the owner's stated funding need to enable refinancing; it is not a verified payoff balance. The new building payment, points, lender terms, guarantees and any unpaid creator invoice remain unknown. Zero-tuition stress funding is {fmt(model['funding']['zero_receipts_before_financing'])}, before those missing costs.

**This cost estimate is not an affordable loan recommendation.** At the historical tuition baseline, ongoing operations are negative even before building and investor payments. Borrowing to hide that loss would repeat the original problem.

## Two full-time adults and individual part-time shifts
"""
body+='| Person | Paid hours/year | Rate/hour | Annual wages |\n|---|---:|---:|---:|\n'
body+=''.join(f'| {name} | {h:,} | {fmt(r)} | {fmt(D(h)*D(r))} |\n' for name,h,r in staff)
body+="""
Total wages: $269,680. Two full-time people, six part-time classroom teachers, one part-time relief floater, one part-time food worker and two individually costed substitutes. This is a total planning roster, not an order to hire twelve new people. Twelve names do not mean twelve adults supervising at once.

7am–noon: director, teacher 1, teachers 2 and 3. Noon–3pm: director, teacher 1, teachers 4 and 5. 3pm–5pm: teachers 4, 5, 6 and 7. Four adults stay on the floor. The floater provides four hours/day: two hours for director administration and two hours for four half-hour breaks, one replacement at a time. Paid hours use 52 weeks; 250 service days leave ten weekday paid closure/training days. Actual holidays, break duration, overtime and relief needs must be checked against the real roster.

This four-adult pattern is conditional. Two groups of twenty preschoolers aged 3–5 can fit the applicable ratios, subject to licensed room capacity and the rule for five-year-olds. Twos require 1:8 with maximum group size 16; mixed-age grouping can require more adults. Eight twos plus two groups of sixteen older children would require five floor adults. We do not assert that every 40-child age mix fits four adults. Confirm child ages and approved rooms before accepting enrollment. If another floor adult is needed across a ten-hour day, allow at least 2,500 additional service hours at $20/hour ($50,000 wages), plus relief, taxes and insurance; it is not in the four-adult base. The qualified director counts only when actually in the classroom; the food worker does not count while preparing food. [Missouri rules](https://www.sos.mo.gov/CMSImages/AdRules/csr/current/5csr/5c25-500.pdf).

Each person's Social Security, Medicare, Missouri unemployment, FUTA and workers compensation is separate in the register. Optional medical contribution and retirement allowances apply only to the two full-time adults. Missouri new-employer planning rate: 2.376% on each person's first $9,000; conditional FUTA: 0.6% on the first $7,000. Actual entity status and rate letter govern. No blanket unemployment reserve is added. [Missouri](https://labor.mo.gov/des/employers/tax-rates), [IRS](https://www.irs.gov/publications/p15). Teacher offers at $20/hour are chosen planning offers, not market averages; the KC preschool median benchmark is $17.98. [Local wage evidence](https://www.onetonline.org/link/localwages/25-2011.00?st=MO).
"""
body+=f"""
## Revenue, year two and repayment
The historical v4.3 draft lists $210/week, converted at 52/12 to **$910/month**. This is not a verified current signed price. The draft's 20% sibling discount may reduce realized receipts further. Do not substitute the old unconfirmed $1,100 assumption for an approved price. At 40 children and 96% cash collection, annual receipts are {fmt(revenue)}. First-year enrollment ramps 30, 34, 36, 38, then 40 for eight months; this is illustrative, not contracted demand.

Ongoing annual expenses remain {fmt(rec)} in year two before inflation and building payments. Operating cash is **{fmt(margin)}** before mortgage, investor debt and profit tax. At forty occupied places, break-even realized tuition is **{fmt(break_even)}/child/month**, before building/debt, with food and processing fees recalculated as enrollment changes. A positive repayment plan requires more than reaching this operating break-even. At the same costs, forty places are the modeled ceiling, not an invitation to enroll beyond licensed capacity. A profitable enrollment count cannot be claimed when even forty children lose money.

Monthly debt capacity = max(0, annual receipts − ongoing expenses − annual building payments) / 1.25 / 12. The 1.25 coverage hurdle is a planning screen, not a lender commitment. When the building payment is unknown, affordable loan capacity is unknown. The digital calculator shows loan payments and whether cash covers them; it does not deduct loan payments from gross revenue and call that profit. No permanent equity is offered. Rate, term, amortization, collateral and guarantees require an actual lender offer. A long term reduces payments but increases total interest; a balloon does not solve repayment without a documented exit.

The current lean model still needs a verified economic reset: signed sustainable tuition, documented existing-cost offsets, narrower paid build milestones, or committed non-debt funding. Existing tuition revenue must cover recurring operations after the first funded year. Unsigned merchandise, church/daycare licensing, grants or national expansion are excluded from debt underwriting. They remain Phase 2 opportunities, evaluated on their own unit economics.

## Every priced category
| Category | First-year allocation |
|---|---:|
"""
body+=''.join(f'| {k} | {fmt(v)} |\n' for k,v in category.items())
body+="""
## Completion, curriculum and production
Platform completion is 380 estimated hours at $150/hour: $57,000, contingent on reusing working code. Inventory/deployment 20h; family/child consent and authentication 40h; CRM/ATS/store integration 25h; curriculum records and parent digest 60h; finite messages/QR 20h; bilingual review 25h; role/private-file security 65h; backup/restore/monitoring 40h; accessibility/iPad verification 35h; acceptance/training/launch 50h. These are scope allowances, not contractor quotes or the replacement value of past work. Six maintenance hours/month is a lean support allowance; escalation must be quoted.

Acceptance requires persistent child records, role isolation, private uploads, consent records, billing without duplicate charges, educator and native-Spanish approval, independent manual security testing and retest, successful offsite restore, real iPad/browser checks and a named support owner. Public pages and merged code alone do not establish readiness. Human-approved finite character messages support routines; no open-ended child chatbot or medical advice is assumed. State approval/accreditation must not be claimed without evidence.

Curriculum mapping, teacher coaching, ongoing educator support, RN routine consultation and dietitian menu review are separately costed. Pilot content reuses the approved characters. The $3,000 generation allowance is a spend cap for a finite pilot library, not twelve seven-minute episodes. Price accepted-minute yield including rejected generations before funding a season. Scripts, education review, editing, captions, sound, licensing and creative lead fees remain separate.

Marketing is $6,000 local media + $1,800 management + $2,400 launch photography + $1,200 materials = $11,400 year one. Test tour-to-enrollment conversion and retention before raising spend. There is no national sales payroll, bulk tablet rental inventory or full-season production in this pilot.

Ralph's forward delivery ($12,000) and ongoing creative oversight ($14,400/year) are explicit. Existing platform/characters/CRM/ATS/video replacement value is not automatically a cash invoice. Reconcile prior scope, deliverables, payments, rights and outstanding fees before adding past compensation. Do not assume past work is free because its amount is unresolved.

## Release gates and missing evidence
First month: verify safe shift coverage, consent, activity records, billing, attendance and support response. Month three: compare actual collections, retention and acquisition costs against the model. Months six and twelve: expand only after positive ongoing cash economics and dependable delivery. Release engineering cash against accepted milestones.

Before a financing decision, obtain the actual age roster/room capacity/hours; existing staff and payroll; current signed tuition/discount policy; twelve months of bills and insurance; inventory/inspection findings; the purpose of $140,000 and lender closing/payment statement; engineering/clinical/production quotes; current tax treatment; and past creator fees/rights. No one can certify the present forecast as a profitable investment without those inputs.

Each cost row identifies its formula, source and whether it is a published price, tax formula or quote-required allowance. Cents make arithmetic reproducible; they do not imply receipt-level accuracy. No food reimbursement, grant, store profit or partner licensing receipt is assumed. Read the digital cost register, CSV and monthly cash table for the complete audit trail. The production bible and operations companion preserve brand and delivery scope; their future creative and expansion concepts remain outside pilot financing.
"""
(ROOT/'documents/Futures_Friends_CURRENT_Pilot_Business_Plan.md').write_text(body)
one=f"""# Futures Friends | 40-child pilot — investor one-sheet
One owned center in Independence, Missouri • Ages 2–5 • Twelve months • October 11, 2026

Booker, Lumi, Zuri and Bop connect curriculum, movement, nutrition and family routines. The pilot proves the experience in one real center before licensing it elsewhere. Existing website, CRM, ATS, store and artwork are reused; working parent/child access, learning records, consent, billing and recovery controls must pass acceptance.

| Investor question | Direct answer |
|---|---|
| Staffing | Two full-time adults, six short-shift teachers, a break/admin floater, food worker and two substitutes. Four floor adults throughout the assumed ten-hour day; age/room grouping must be approved. Wages $269,680. |
| Annual operating cost | {fmt(rec)} recurring; continues in year two, before inflation and building payments. |
| Completion and launch | {fmt(once)} one-time. Includes $57,000 platform completion, curriculum/clinical review, finite content and security. Local marketing totals $11,400 year one. |
| Reserves | {fmt(cont)} contingency (15% of one-time spend) and {fmt(floor)} one-month working capital. No blanket unemployment reserve. |
| Building | $140,000 owner funding requirement enabling refinance; payoff, terms and new payment unverified. $700,000 placeholder removed. |
| Cash need | {fmt(model['funding']['request_before_financing'])} estimate = $140,000 + {fmt(peak)} peak pilot deficit + contingency + cash floor. Excludes unresolved mortgage/debt and past creator fees. Not a final loan ask. |
| Receipts | Historical $210/week ≈ $910/month; 96% collection. Forty full-year places collect {fmt(revenue)} before discounts; current signed tuition unverified. |
| Repayment reality | Full-enrollment operating cash {fmt(margin)} before building/debt. Break-even realized tuition {fmt(break_even)}/month before those payments. Current case does not support borrowing; costs/tuition/funding must change. |
| Investor terms | No permanent equity. Payment capacity follows cash after operations and building payment, with a 1.25 coverage screen. Terms/collateral/guarantees require an offer. |
| Control | Accepted build milestones; consent/role/billing tests; security retest; offsite restore; educator/Spanish approval. Reviews at months 1, 3, 6 and 12. |
| Deferred | National operations, full animated season, bulk family tablets and unsigned licensing income. |

Before agreement: verify child ages, staffing/hours, tuition and discounts, operating bills, building/lender statement, bids, insurance, tax status and creator compensation/rights. Each price and evidence basis is inspectable in the digital cost register. A pilot reduces execution risk; it does not eliminate the need for positive recurring economics.
"""
(ROOT/'documents/Futures_Friends_CURRENT_Pilot_One_Sheet.md').write_text(one)
print(json.dumps(dict(lines=len(lines),**model['totals'],**model['funding'],**model['metrics']),indent=2))
