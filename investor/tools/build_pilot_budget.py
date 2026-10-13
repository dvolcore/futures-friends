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
def add(cat,item,unit,qty,rate,bucket='recurring',src='allow',notes='',purpose='',deliverable=''):
 basis,url=sources[src]
 lines.append(dict(id=f'P{len(lines)+1:03}',category=cat,item=item,unit=unit,quantity=float(D(qty)),rate=float(D(rate)),annual=float(M(D(qty)*D(rate))),bucket=bucket,basis=basis,url=url,notes=notes,purpose=purpose,deliverable=deliverable))
# v5 (owner-confirmed 2026-10-13): all-day care, ages 2–5, full enrollment 38. Four full-time caregivers and one part-time floater per day;
# the owner serves as director, unpaid ($0 wages); no food worker (meals prepared by staff; food costs retained); no paid substitutes.
# The v4 roster is archived in costs/archive/.
CAP=38
staff=[('Owner-director (unpaid)',2080,0),('Full-time caregiver 1',2080,16),('Full-time caregiver 2',2080,16),('Full-time caregiver 3',2080,16),('Full-time caregiver 4',2080,16),('Part-time break/admin floater',1040,16)]
WAGE_NOTE=' All staff $16/hr (owner-confirmed 2026-10-13); above Missouri 2026 minimum wage $15.00.'
BENEFITS=False   # no employer medical or retirement contribution in v5
ADDL_COVERAGE='Any additional classroom coverage beyond the four caregivers and floater is provided by the owner-director and a head of administration at no added payroll cost (owner, 2026-10-13). Anyone counted in ratio keeps Missouri records on file: background check, medical/TB report, orientation, 12 annual training hours (5 CSR 25-500.102, .122).'
RATIO_NOTE='Ages 2–5 · 38 children all day · 4 caregivers on the floor in two groups of ≤20 (Missouri 1:10, ≤4 two-year-olds per group; 5 CSR 25-500.112).'
for name,hours,rate in staff:
 wage=M(D(hours)*D(rate))
 note='Total planning roster, not all new hires. 52 paid weeks include closure/training allowance; actual roster and hours must replace estimates.'
 if 'director' in name:note='Owner serves as director (unpaid); a market director salary (~$60k all-in) is excluded. Missouri requires a qualified director on duty 40 h/wk (5 CSR 25-500.102(2)).'
 if 'director' not in name:note+=WAGE_NOTE
 if 'caregiver' in name:note+=' '+RATIO_NOTE+' Meals prepared by staff; food costs retained. No paid substitutes — the floater covers absences, leaving breaks uncovered on those days.'
 add('Staff wages',name,'paid hours',hours,rate,src='wage',notes=note)
 add('Employer taxes',name+' — Social Security','taxable wages',wage,'.062',src='fica')
 add('Employer taxes',name+' — Medicare','taxable wages',wage,'.0145',src='fica')
 add('Employer taxes',name+' — Missouri unemployment','taxable wage base',min(wage,D(9000)),'.02376',src='suta',notes='Actual experience rate/entity treatment controls. No separate unemployment reserve.')
 add('Employer taxes',name+' — FUTA','taxable wage base',min(wage,D(7000)),'.006',src='futa',notes='Conditional full-credit taxable-employer assumption; accountant must confirm.')
 add('Staff insurance',name+' — workers compensation','covered wages',wage,'.02',notes='2% unquoted classification allowance; broker quote required.')
 if BENEFITS and name.startswith('Full-time'):
  add('Staff benefits',name+' — employer medical contribution','months',12,300,notes='Optional employer contribution allowance, not an insurance quote.')
  add('Staff benefits',name+' — retirement contribution','eligible wages',wage,'.03',notes='Optional 3% policy; eligibility and plan terms unresolved.')
for name,_,_ in staff:
 add('Staff readiness',name+' — FCSR registration','registration',1,'16.57','one_time','fcsr','Reuse valid existing checks where permitted.')
 add('Staff readiness',name+' — other background checks','check allocation',1,'58.43','one_time',notes='Unquoted fingerprint/registry balance; verify requirements.')
 add('Staff readiness',name+' — CPR/first aid','seat',1,85,'one_time')
 add('Staff readiness',name+' — annual training','seat',1,150,notes='Paid training time included in wages; confirm approved provider.')
 add('Staff readiness',name+' — uniform','shirts',3,25,'one_time')
ADMIN_NOTE='Owner cut 2026-10-13: bookkeeping in-house via the Hub; admin halved.'
add('Administration','Payroll Plus base','months',12,40,src='gusto',notes=ADMIN_NOTE)
add('Administration','Payroll Plus employee fee','person-months',sum(1 for _,h,r in staff if r)*12,6,src='gusto',notes=f'{sum(1 for _,h,r in staff if r)} paid adults (the unpaid owner-director is not on payroll); adjust to actual billed roster. '+ADMIN_NOTE)
add('Administration','Bookkeeping service','months',12,150,notes='Owner 2026-10-13: part-time bookkeeper, half the original allowance.')
add('Administration','Tax preparation','filing',1,1000,notes='Owner-set tax preparation budget: $1,000/year (2026-10-13).')
add('Administration','QuickBooks subscription','months',12,38,src='qb')
add('Administration','Operating bank fees','months',12,0,notes='No-fee business account. '+ADMIN_NOTE)
add('Administration','Business phone','months',12,40)
add('Administration','Postage','pieces',120,'.8')
add('Administration','Notary','documents',10,10)
add('Administration','Annual business license allowance','renewal',1,250,notes='City gross-receipts calculation and entity exemption unresolved.')
add('Administration','City childcare permit','year',1,250,src='permit')
add('Administration','Food permit allowance','year',1,600,notes='Risk class/exemption must be confirmed; do not pay twice if included in existing license.')
add('Administration','Food manager training allowance','seat',1,30,'one_time')
add('Administration','Food handler permit allowance','seats',2,25,'one_time')
# 38 children, 250 meal-service days. Quoted menus may alter individual quantities.
for item,rate in [('Milk', '.50'),('Fruit','.60'),('Vegetables','.50'),('Protein','.90'),('Grains','.45'),('Allergy substitutes','.15'),('Special diets','.10'),('Food disposables','.15'),('Food waste allowance','.16')]:
 add('Food and nutrition',item,'child service-days',CAP*250,rate,notes=f'{CAP} × 250 days; per-category purchasing allowance, not a supplier quote. No food-program reimbursement assumed.')
for item,qty,rate in [('Food storage supplies',24,15),('Kitchen service',2,300),('Refrigerator service',2,200),('Freezer service',2,200),('Dishwashing supplies',12,35),('Kitchen gloves',24,12),('Aprons',6,20)]:add('Food and nutrition',item,'units / service visits',qty,rate)
for item,rate in [('Electricity',600),('Natural gas',175),('Water/sewer',175),('Internet',120),('Waste collection',125),('Pest service',75),('Alarm monitoring',40)]:add('Building operations',item,'months',12,rate,notes='Existing bill required; owned facility, no rental deposit or lease rent included.')
# v5.1 (owner 2026-10-13): HVAC service, electrical maintenance, lawn service, parking repairs and staff mobile connectivity are handled in-house
# (lines removed); snow service is halved to 4 visits.
IN_HOUSE='Owner 2026-10-13: handled in-house.'
for item,qty,rate in [('Plumbing maintenance',4,200),('Snow service',4,150),('Deep cleaning',4,400),('Property taxes',1,6000),('Building repair allocation',1,3000)]:add('Building operations',item,'visits / annual allowance',qty,rate,notes='Property tax bill, maintenance history and scope required; no major renovation assumed.')
_snow=next(x for x in lines if x['item']=='Snow service'); _snow['notes']+=' Halved: '+IN_HOUSE
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
transactions=D(CAP)*12*COLLECTION
add('Payments','ACH processing — 95% collections','transactions',transactions*D('.95'),min(TUITION*D('.008'),D(5)),src='stripe',notes='Expected paid monthly transactions; fees vary with tuition and occupancy.')
add('Payments','Card processing — 5% collections','transactions',transactions*D('.05'),TUITION*D('.029')+D('.30'),src='stripe')
add('Payments','Recurring billing fee','collected dollars',D(CAP)*12*TUITION*COLLECTION,'.007',src='stripe',notes='Confirm whether existing billing avoids this fee; separate from processing.')
add('Payments','Refund/chargeback fee allowance','events',12,15)
add('Curriculum and clinical review','Initial curriculum completion / mapping','educator hours',60,125,'one_time','edu','Owner-set 2026-10-13: one-time $7,500; no recurring curriculum fee. Specific benchmark, not industry-wide average; child development approval required.')
add('Curriculum and clinical review','Staff curriculum implementation coaching','educator hours',24,125,'one_time','edu')
# v5.1 (owner 2026-10-13): no recurring curriculum fee — the former 'Ongoing curriculum support' line (48 h × $125) is removed.
add('Curriculum and clinical review','RN initial health/routine review','hours',16,125,'one_time')
add('Curriculum and clinical review','RN recurring consultation','hours',16,125,notes='Owner-set 2026-10-13: RN consultation $2,000/year. Clinical consultant allowance; does not replace medical diagnosis or dietitian expertise.')
add('Curriculum and clinical review','Registered dietitian menu review','hours',12,150,'one_time')
add('Curriculum and clinical review','Native Spanish curriculum review','hours',20,75,'one_time',notes='Owner-set 2026-10-13: one-time $1,500; no recurring Spanish review.')
# v5.1 (owner 2026-10-13): no recurring Spanish review — the former 'Native Spanish update review' line (24 h × $75) is removed.
add('Pilot content production','Ralph / creative production lead — finite pilot asset delivery','hours',120,100,'one_time',notes='Proposed forward creative fee, not repayment of past work; covers pilot clips/design reuse. Scope and rights agreement required.')
add('Pilot content production','Pilot scriptwriting and storyboards','hours',24,75,'one_time')
add('Pilot content production','Editing sound captions and exports','hours',60,75,'one_time')
add('Pilot content production','Education review of scripts','hours',12,125,'one_time','edu')
add('Pilot content production','Generation credits pilot spend cap','allowance',1,3000,'one_time',notes='Unattributed planning cap; does NOT promise twelve 7-minute episodes. Test accepted-minute yield before committing scope or credit purchases.')
add('Pilot content production','Voice/music licensing allowance','allowance',1,1500,'one_time')
add('Pilot content production','Creative software allowance','months',12,120,notes='Subscription basket quote needed; do not duplicate tools included in vendor fees.')
add('Pilot content support','Ralph / creative lead — pilot-year oversight and updates','hours',60,100,'one_time',notes='Owner-set 2026-10-13: one-time $6,000 for the pilot year; smaller release calendar with defined paid deliverables; not ongoing. Past services excluded pending reconciliation.')
add('Local marketing','Paid local advertising','months',12,500,notes='Tested channel budget cap, not proven cost per enrollment. Pause/reallocate on conversion evidence.')
add('Local marketing','Campaign management and analytics','hours',18,100,notes='1.5 hours/month; distinct from creative production. No national sales team.')
add('Local marketing','Launch photography / approved brand asset refresh','engagement',1,2400,'one_time',notes='Use existing artwork; consent-backed real photos only. Quote scope.')
add('Local marketing','Tour materials and local signage','allowance',1,1200,'one_time')
add('Store pilot','Made-to-order sample merchandise','sample units',20,20,'one_time',notes='No warehouse, bulk stock or unsigned merchandise income. Fulfillment paid from sales; unit margin validated before accepting orders.')
add('Store pilot','Store fulfillment test shipments','test shipments',10,15,'one_time')
add('Refinance transaction','Appraisal allowance','engagement',1,3000,'one_time',notes='Lender quote needed; owner $140,000 is separate proceeds requirement, not verified debt balance.')
add('Refinance transaction','Title recording and lender closing allowance','allowance',1,2000,'one_time',notes='Origination points, taxes, payoff penalties and legal fees may be additional; unknown lender statement required.')
add('Refinance transaction','Refinance counsel allowance','hours',4,350,'one_time')

# v5.1 owner-set budgets (2026-10-13): food and nutrition capped at $2,000/month; toiletries and cleaning at $300/month.
# Each capped category's lines are scaled proportionally so the category sums to the budget exactly at full enrollment.
FOOD_CAP_MONTH=D(2000); CLEANING_MONTH=D(300)
FOOD_NOTE='Owner-set food allowance cap: $2,000/month (2026-10-13). Must still meet Missouri meal pattern (5 CSR 25-500.202: breakfast or AM snack, lunch, PM snack; milk with each meal; ≤4 h between).'
CLEANING_NOTE='Owner-set toiletries & cleaning budget: $300/month (2026-10-13).'
FOOD_PER_CHILD_DAY=D('3.51')   # the uncapped per-child purchasing model (milk, fruit, vegetables, protein, grains, substitutes, disposables, waste)
FOOD_FIXED0=sum(D(x['annual']) for x in lines if x['category']=='Food and nutrition' and x['unit']!='child service-days')
def food_uncapped(c):return FOOD_FIXED0+FOOD_PER_CHILD_DAY*D(c)*250
def food_capped(c):return min(food_uncapped(c),FOOD_CAP_MONTH*12)
def cap_category(cat,target,note,skip=()):
 rows=[x for x in lines if x['category']==cat and x['item'] not in skip]; total=sum(D(x['annual']) for x in rows); f=target/total
 for x in rows:x['annual']=float(M(D(x['annual'])*f))
 big=max(rows,key=lambda x:x['annual']); big['annual']=float(M(D(big['annual'])+target-sum(D(x['annual']) for x in rows)))
 for x in rows:
  x['rate']=float((D(x['annual'])/D(x['quantity'])).quantize(D('.000001'),rounding=ROUND_HALF_UP)); x['notes']=(x['notes']+' '+note).strip()
 assert sum(D(x['annual']) for x in rows)==target
cap_category('Food and nutrition',food_capped(CAP),FOOD_NOTE)
# Owner cut (2026-10-13): paper towels and classroom/office consumables halved (bulk purchasing, existing inventory, no duplicate orders).
# The $300/month toiletries budget scales the eight other cleaning lines by their share of the original basket; paper towels sit at half.
HALF_NOTE='Owner cut 2026-10-13: halved via bulk purchasing, existing inventory, no duplicate orders.'
_clean=[x for x in lines if x['category']=='Cleaning and consumables']; _towels=next(x for x in _clean if x['item']=='Paper towels')
_clean0=sum(D(x['annual']) for x in _clean); _towels0=D(_towels['annual'])
cap_category('Cleaning and consumables',M(CLEANING_MONTH*12*(_clean0-_towels0)/_clean0),CLEANING_NOTE,skip=('Paper towels',))
_towels.update(annual=float(M(_towels0/2)),rate=float(M(D(_towels['rate'])/2)),notes=(_towels['notes']+' '+HALF_NOTE).strip())
assert D(str(_towels['quantity']))*D(str(_towels['rate']))==D(str(_towels['annual']))
_class0=sum(D(x['annual']) for x in lines if x['category']=='Classroom and office consumables')
cap_category('Classroom and office consumables',M(_class0/2),HALF_NOTE)
CLEANING_ANNUAL=sum(D(x['annual']) for x in _clean); CLASSROOM_ANNUAL=sum(D(x['annual']) for x in lines if x['category']=='Classroom and office consumables')
# Owner-locked utilities: electricity, gas and water/sewer total $1,500/month, split in proportion to the earlier monthly allowances
UTILITIES_MONTH=D(1500); UTILITIES_NOTE='Owner-locked utilities: electricity, gas and water/sewer total $1,500/month (2026-10-13).'
util=[x for x in lines if x['category']=='Building operations' and x['item'] in ('Electricity','Natural gas','Water/sewer')]
assert len(util)==3 and all(x['quantity']==12 for x in util)
_u0=sum(D(str(x['rate'])) for x in util); _r=[M(D(str(x['rate']))*UTILITIES_MONTH/_u0) for x in util]; _r[-1]+=UTILITIES_MONTH-sum(_r)
for x,r in zip(util,_r):x.update(rate=float(r),annual=float(M(r*12)),notes=(x['notes']+' '+UTILITIES_NOTE).strip())
assert sum(D(str(x['annual'])) for x in util)==UTILITIES_MONTH*12
# Each platform allowance carries a purpose and a testable deliverable.
platform_annotations=[('Confirm the existing work is reusable before committing the completion price.', 'Code and dependency audit, written remaining-work scope, reproducible staging and production deployment.'), ('Give parents secure access to their own family and preserve consent evidence.', 'Invites, login, password reset, family linking and parent consent; another family cannot be accessed.'), ('Connect the existing CRM, ATS and store to the pilot workflows.', 'Existing applicant/customer records and store checkout tested end to end; this is integration, not three new products.'), ('Make approved learning activities teachable and save the work children complete.', 'Educator-approved activities, persistent learning records, teacher review and a parent weekly digest.'), ('Deliver short character-led routines safely at home and in the classroom.', 'Parent-approved finite character messages and QR routines; no open-ended child AI conversation.'), ('Let families complete essential workflows in English or Spanish.', 'Critical journeys and content reviewed in both languages; native-language sign-off required.'), ('Protect child records and files behind server-enforced access rules.', 'Staff MFA, role and family isolation, private uploads and audit events tested with separate accounts.'), ('Keep a recoverable copy and respond when something fails.', 'Offsite backups, demonstrated restore, monitoring, rollback and a named incident owner.'), ('Make the pilot usable on the devices families actually use.', 'Safari/iPad, mobile layout, keyboard and accessibility checks on agreed devices.'), ('Prove the complete pilot works before inviting real families.', f'{CAP} synthetic family accounts tested end to end, staff training, documented acceptance and a 30-day checkpoint.'), ('Obtain independent security evidence.', 'Manual multi-role application/API penetration test and retest; no unresolved Critical or High findings at launch.'), ('Review child privacy and home-use obligations with qualified counsel.', 'Consent, retention, vendor data agreements and home-use notices reviewed; legal approval is not yet established.'), ('Keep privacy and security procedures current through the pilot.', '24 hours/year, averaging two hours/month; documented review and update log.'), ('Provide a named person for routine fixes and operating support.', '72 hours/year, averaging six hours/month; written response targets. Extra work requires a separate quote, not 24/7 coverage.'), ('Production server needed for the pilot service.', 'Production server configured and verified; usage, renewal and account ownership recorded.'), ('Staging server needed for the pilot service.', 'Staging server configured and verified; usage, renewal and account ownership recorded.'), ('Object storage needed for the pilot service.', 'Object storage configured and verified; usage, renewal and account ownership recorded.'), ('Daily server backup needed for the pilot service.', 'Daily server backup configured and verified; usage, renewal and account ownership recorded.'), ('Managed database/authentication needed for the pilot service.', 'Managed database/authentication configured and verified; usage, renewal and account ownership recorded.'), ('Transactional email needed for the pilot service.', 'Transactional email configured and verified; usage, renewal and account ownership recorded.'), ('Offsite recovery storage needed for the pilot service.', 'Offsite recovery storage configured and verified; usage, renewal and account ownership recorded.'), ('Monitoring needed for the pilot service.', 'Monitoring configured and verified; usage, renewal and account ownership recorded.'), ('Domain needed for the pilot service.', 'Domain configured and verified; usage, renewal and account ownership recorded.'), ('Staff password manager needed for the pilot service.', 'Staff password manager configured and verified; usage, renewal and account ownership recorded.'), ('Help desk needed for the pilot service.', 'Help desk configured and verified; usage, renewal and account ownership recorded.'), ('SMS needed for the pilot service.', 'SMS configured and verified; usage, renewal and account ownership recorded.'), ('CDN/security needed for the pilot service.', 'CDN/security configured and verified; usage, renewal and account ownership recorded.'), ('Usage overage allowance needed for the pilot service.', 'Usage overage allowance configured and verified; usage, renewal and account ownership recorded.')]
PS=next(i for i,x in enumerate(lines) if x['category']=='Platform completion')+1   # the first platform line (P250 in v4)
for number, (purpose, deliverable) in enumerate(platform_annotations, PS):
 row=lines[number-1]
 assert row["id"] == f"P{number:03}"
 row.update(purpose=purpose, deliverable=deliverable)

_n=len(lines); _w=M(D(2080)*D(24))
add('Staff wages','Full-time director','paid hours',2080,24,src='wage')
add('Employer taxes','Full-time director — Social Security','taxable wages',_w,'.062',src='fica'); add('Employer taxes','Full-time director — Medicare','taxable wages',_w,'.0145',src='fica')
add('Employer taxes','Full-time director — Missouri unemployment','taxable wage base',min(_w,D(9000)),'.02376',src='suta'); add('Employer taxes','Full-time director — FUTA','taxable wage base',min(_w,D(7000)),'.006',src='futa')
add('Staff insurance','Full-time director — workers compensation','covered wages',_w,'.02'); add('Staff benefits','Full-time director — employer medical contribution','months',12,300)
add('Staff benefits','Full-time director — retirement contribution','eligible wages',_w,'.03'); add('Staff readiness','Full-time director — annual training','seat',1,150)
MARKET_DIRECTOR=M(sum(D(x['annual']) for x in lines[_n:])); del lines[_n:]
for _x in lines:
 _x['notes']=_x['notes'].replace('(~$60k all-in)',f'(about ${MARKET_DIRECTOR:,.2f} all-in)')
rec=M(sum(D(x['annual']) for x in lines if x['bucket']=='recurring')); once=M(sum(D(x['annual']) for x in lines if x['bucket']=='one_time'))
# Contingency applies to unquoted completion/launch risk, not another payroll tax.
cont=M(once*D('.15')); floor=M(rec/12); refi=D(140000)
pay=M(sum(D(x['annual']) for x in lines if x['category']=='Payments' and 'Refund' not in x['item']))
food=food_capped(CAP); fixed=M(rec-food-pay)
oneweights=[D('.45'),D('.25'),D('.15'),D('.10'),D('.05')]+[D(0)]*7
children=[min(c,CAP) for c in [30,34,36,38]+[40]*8]
cash=[]; cumulative=D(0); remaining=once
for i,c in enumerate(children):
 operating=M(fixed/12+food_capped(c)/12+payment_fees(c)/12)   # monthly food = min(uncapped model, $2,000)
 o=M(once*oneweights[i]) if i<11 else remaining;remaining-=o
 receipts=M(D(c)*TUITION*COLLECTION); net=M(receipts-operating-o);cumulative+=net
 cash.append(dict(month=i+1,children=c,receipts=float(receipts),recurring=float(operating),one_time=float(o),net=float(net),cumulative=float(M(cumulative))))
peak=M(max([D(0)]+[-D(c['cumulative']) for c in cash])); revenue=M(D(CAP)*TUITION*12*COLLECTION);margin=M(revenue-rec)
def annual_margin(t,c=CAP):return M(D(c)*D(t)*12*COLLECTION-fixed-food_capped(c)-payment_fees(c,D(t)))
lo=D(0);hi=D(5000)
for _ in range(60):
 mid=(lo+hi)/2
 if annual_margin(mid)<0:lo=mid
 else:hi=mid
break_even=M(hi)
WAGES=M(sum(D(h)*D(r) for _,h,r in staff))
# Payback timing from the cash schedule: the first month with positive net cash, and the month cumulative cash turns positive
# (after month 12 the month-12 net repeats: full enrollment, one-time costs finished). None if never.
FIRST_POS=next((c['month'] for c in cash if c['net']>0),None)
_cum=D(str(cash[-1]['cumulative'])); _steady=D(str(cash[-1]['net'])); CUM_POS=next((c['month'] for c in cash if c['cumulative']>=0),None)
if CUM_POS is None and _steady>0:
 _n=len(cash)
 while _cum<0:_n+=1;_cum+=_steady
 CUM_POS=_n
model=dict(meta=dict(title='Futures Friends | 38-child 12-month pilot',prepared='2026-10-13',version='pilot-38-v5.1',status=('Conditional planning estimate; positive operating margin before building payments and debt at the planning assumptions; owner-director unpaid' if margin>0 else 'Conditional planning estimate; ongoing economics do not yet support borrowing; owner-director unpaid'),scope='One owned location, ages 2–5; first-month checkpoint; national expansion deferred.',line_count=len(lines)),totals=dict(recurring=float(rec),one_time=float(once),contingency=float(cont),gross_before_contingency=float(rec+once),gross_first_year=float(rec+once+cont),refinance=140000),lines=lines,cash=cash,assumptions=dict(tuition=910,tuition_basis='Owner-confirmed 2026-10-13: locked-in rate of $210/week per child (session enrollment), converted using 52/12 = $910/month; assumes 52 billed weeks; no tuition increases assumed; sibling discounts would lower realized revenue.',tuition_weekly=210,ages='2–5',capacity=CAP,collection=.96,mortgage_payment=None,mortgage_status='UNKNOWN — excluded, not free',cash_ramp=children,service_days=250,open_hours=10,past_creator_fees='Excluded pending signed deliverables, payments and rights reconciliation'),funding=dict(peak_deficit=float(peak),cash_floor=float(floor),request_before_financing=float(M(refi+peak+cont+floor)),zero_receipts_before_financing=float(M(refi+rec+once+cont+floor)),financing_status=('Cost estimate, not a financeable loan request. Positive ongoing operating margin before building payments and debt, with the owner as unpaid director; mortgage, debt, lender fees and past creator invoice unresolved.' if margin>0 else 'Cost estimate, not a financeable loan request. Negative ongoing margin; mortgage, debt, lender fees and past creator invoice unresolved.')),metrics=dict(year2_margin=float(margin),breakeven_tuition=float(break_even),full_enrollment_receipts=float(revenue),first_cash_positive_month=FIRST_POS,cumulative_cash_positive_month=CUM_POS,cumulative_basis='Month in which cumulative pilot cash turns positive: the published 12-month schedule, then month 12 net repeated (full enrollment, no further one-time costs); before building payments and debt.'),recurring_components=dict(fixed_annual=float(fixed),variable_per_child_day=float(FOOD_PER_CHILD_DAY),food_fixed_annual=float(FOOD_FIXED0),food_cap_annual=float(FOOD_CAP_MONTH*12),food_cap_monthly=float(FOOD_CAP_MONTH),cleaning_budget_monthly=float(CLEANING_MONTH),cleaning_annual=float(CLEANING_ANNUAL),classroom_consumables_annual=float(CLASSROOM_ANNUAL),utilities_annual=float(UTILITIES_MONTH*12),service_days=250,payment_annual=float(pay)),staffing=dict(full_time=4,people=len(staff),paid_people=sum(1 for _,h,r in staff if r),wages=float(WAGES),floor_caregivers=4,groups=2,max_group=20,children=CAP,ages='2–5',director=f'Owner serves as director (unpaid); a market director salary (about ${MARKET_DIRECTOR:,.2f} all-in) is excluded. Missouri requires a qualified director on duty 40 h/wk (5 CSR 25-500.102(2)).',ratio_note=RATIO_NOTE,additional_coverage=ADDL_COVERAGE,ratio_basis='5 CSR 25-500.112: mixed ages 2+ with ≤4 two-year-olds per group 1:10, max group 20; >4 two-year-olds 1:8, max 16',coverage='All-day care for 38 children: four full-time caregivers on the floor in two groups of ≤20; a part-time floater covers breaks and lunch relief; no food worker (meals prepared by staff; food costs retained); no paid substitutes (the floater covers absences, leaving breaks uncovered on those days); the owner is the unpaid director.',schedule=[dict(time='7am–5pm',people='Four full-time caregivers in two groups of ≤20'),dict(time='Breaks and lunch',people='Part-time floater (relief)')]),sources_checked='2026-10-11 primary tax, wage and vendor references; allowances require written quotes')

def category_sum(cat):return M(sum(D(x['annual']) for x in lines if x['category']==cat))
def platform_sum(start,end,bucket=None):
 return M(sum(D(x['annual']) for x in lines[start-1:end] if bucket is None or x['bucket']==bucket))
o=PS-250
model['platform']=dict(completion=float(platform_sum(250+o,259+o)),assurance_one_time=float(platform_sum(260+o,263+o,'one_time')),one_time=float(platform_sum(250+o,277+o,'one_time')),recurring=float(platform_sum(250+o,277+o,'recurring')),hosting=float(platform_sum(264+o,277+o)),first_year=float(platform_sum(250+o,277+o)),monthly=float(M(platform_sum(250+o,277+o,'recurring')/12)),contingency_included=float(M(platform_sum(250+o,277+o,'one_time')*D('.15'))),build_rows=lines[249+o:259+o],service_rows=lines[259+o:263+o],hosting_rows=lines[263+o:277+o],gates=[x[1] for x in platform_annotations[:10]],readiness='Completion estimate, not proof of a live service. The October 10 source plan reported unhosted services, draft activities, unconnected billing and pending consent/testing. Current live acceptance remains unverified.',separate_costs=dict(curriculum_clinical=float(category_sum('Curriculum and clinical review')),pilot_content=float(category_sum('Pilot content production')),creative_oversight=float(category_sum('Pilot content support')),devices=float(category_sum('Pilot devices'))),rate_basis='$150/hour is a selected planning allowance, not a published market average or a vendor quote. A fixed-scope completion quote must confirm that the existing code is reusable.')

model['reference']=dict(market_director_all_in=float(MARKET_DIRECTOR),basis='Not in the budget: the v4 full-time director line family (2,080 h × $24, statutory taxes, workers compensation, $300/month medical, 3% retirement, annual training), shown so a paid director can be tested in the Profit lab.')
model['sensitivity']=[dict(children=c,tuition=t,receipts=float(M(D(c)*D(t)*12*COLLECTION)),annual_operating_margin=float(annual_margin(t,c)),basis='Illustrative price test, not verified market tuition; building and debt excluded') for t in [910,1250,1300,1400] for c in [30,34,CAP]]
for path in ['costs/pilot-budget.json','Digital/model/pilot-budget.json']:(ROOT/path).write_text(json.dumps(model,indent=2)+'\n')
for filename,data in [('Pilot_38_Children_Itemized.csv',lines),('Pilot_38_Children_Monthly_Cash.csv',cash)]:
 with (ROOT/'costs'/filename).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(data[0]),lineterminator="\n");w.writeheader();w.writerows(data)
fmt=lambda v:('-' if D(v)<0 else '')+f'${abs(D(v)):,.2f}'
category={}
for l in lines:category[l['category']]=M(category.get(l['category'],0)+D(l['annual']))
body=f"""# Futures Friends — current 38-child pilot business and funding plan

Prepared October 13, 2026 (model {model['meta']['version']}; staffing, tuition and the food, cleaning, utilities, tax-preparation and curriculum budgets owner-confirmed). One owned Independence, Missouri location, ages 2–5, all-day care for 38 children, twelve months of operations and a first-month checkpoint. This replaces the expanded $3,139,152.61 case and the discarded $700,000 refinance assumption. National rollout belongs to Phase 2.

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

**This cost estimate is not an affordable loan recommendation.** {'At the owner-confirmed tuition, ongoing operations show a positive operating margin of '+fmt(margin)+' before building and investor payments, with the owner serving as unpaid director; the building payment and debt terms are unknown, so loan affordability is not established.' if margin>0 else 'At the owner-confirmed tuition, ongoing operations are negative even before building and investor payments. Borrowing to hide that loss would repeat the original problem.'}

## Four full-time caregivers, a floater, and the owner as unpaid director
"""
body+='| Person | Paid hours/year | Rate/hour | Annual wages |\n|---|---:|---:|---:|\n'
body+=''.join(f'| {name} | {h:,} | {fmt(r)} | {fmt(D(h)*D(r))} |\n' for name,h,r in staff)
body+=f"""
Total wages: {fmt(WAGES)}. Four full-time caregivers and one part-time relief floater, all at $16/hour (owner-confirmed October 13, 2026; above the Missouri 2026 minimum wage of $15.00), with no employer health benefit. The owner serves as director, unpaid; a market director salary (about {fmt(MARKET_DIRECTOR)} all-in) is excluded. There is no food worker (meals are prepared by staff; food costs are retained) and no paid substitutes.

All-day care, 7am–5pm, for 38 children ages 2–5: four caregivers on the floor in two groups of no more than twenty. The floater covers breaks and lunch relief; on days the floater covers an absence, breaks are uncovered. Paid hours use 52 weeks; 250 service days leave ten weekday paid closure/training days. Actual holidays, break duration, overtime and relief needs must be checked against the real roster.

This four-caregiver pattern is conditional. Missouri allows 1:10 with a maximum group of 20 for mixed ages 2 and up only if a group has no more than four 2-year-olds (5 CSR 25-500.112); otherwise 1:8 with a maximum group of 16 applies and more adults are needed. A qualified director must be on duty 40 hours a week (5 CSR 25-500.102(2)); the owner fills that role unpaid. Confirm child ages and approved rooms before accepting enrollment. {ADDL_COVERAGE} [Missouri rules](https://www.sos.mo.gov/CMSImages/AdRules/csr/current/5csr/5c25-500.pdf).

Each person's Social Security, Medicare, Missouri unemployment, FUTA and workers compensation is separate in the register. No employer medical or retirement contribution is included. Missouri new-employer planning rate: 2.376% on each person's first $9,000; conditional FUTA: 0.6% on the first $7,000. Actual entity status and rate letter govern. No blanket unemployment reserve is added. [Missouri](https://labor.mo.gov/des/employers/tax-rates), [IRS](https://www.irs.gov/publications/p15). The $16/hour rate is the owner-confirmed pay for every role; the KC preschool median benchmark is $17.98. [Local wage evidence](https://www.onetonline.org/link/localwages/25-2011.00?st=MO).
"""
body+=f"""
## Revenue, year two and repayment
The owner confirmed on October 13, 2026 a locked-in rate of **$210/week per child**, converted at 52/12 to **$910/month** (52 billed weeks; no tuition increases assumed). Sibling discounts would reduce realized receipts. At 38 children and 96% cash collection, annual receipts are {fmt(revenue)}. First-year enrollment ramps 30, 34, 36, then 38 from month four; this is illustrative, not contracted demand.

Ongoing annual expenses remain {fmt(rec)} in year two before inflation and building payments. Operating cash is **{fmt(margin)}** before mortgage, investor debt and profit tax. At 38 occupied places, break-even realized tuition is **{fmt(break_even)}/child/month**, before building/debt, with food held at the owner's {fmt(FOOD_CAP_MONTH)}/month cap and processing fees recalculated as enrollment changes. Many costs are one-time: {fmt(once)} of launch and completion spending falls in months 1–{max(c['month'] for c in cash if c['one_time']>0)}, against {fmt(rec)}/year of recurring cost. Net cash turns positive in month {FIRST_POS}, and cumulative pilot cash turns positive in month {CUM_POS} at the month-12 rate, before building payments and debt. A positive repayment plan requires more than reaching this operating break-even. At the same costs, 38 places are the modeled ceiling, not an invitation to enroll beyond licensed capacity.{'' if margin>0 else ' A profitable enrollment count cannot be claimed when even full enrollment loses money.'}

Monthly debt capacity = max(0, annual receipts − ongoing expenses − annual building payments) / 1.25 / 12. The 1.25 coverage hurdle is a planning screen, not a lender commitment. When the building payment is unknown, affordable loan capacity is unknown. The digital calculator shows loan payments and whether cash covers them; it does not deduct loan payments from gross revenue and call that profit. No permanent equity is offered. Rate, term, amortization, collateral and guarantees require an actual lender offer. A long term reduces payments but increases total interest; a balloon does not solve repayment without a documented exit.

{'The positive operating margin rests on planning assumptions that still need verification before any loan is sized: signed enrollment at the locked-in rate, actual bills, payroll and insurance, the building payment and lender terms.' if margin>0 else 'The current lean model still needs a verified economic reset: signed sustainable tuition, documented existing-cost offsets, narrower paid build milestones, or committed non-debt funding.'} Existing tuition revenue must cover recurring operations after the first funded year. Unsigned merchandise, church/daycare licensing, grants or national expansion are excluded from debt underwriting. They remain Phase 2 opportunities, evaluated on their own unit economics.

## Every priced category
| Category | First-year allocation |
|---|---:|
"""
body+=''.join(f'| {k} | {fmt(v)} |\n' for k,v in category.items())
body+=f"""
Owner-set budgets (October 13, 2026): food and nutrition is capped at {fmt(FOOD_CAP_MONTH)}/month ({fmt(FOOD_CAP_MONTH*12)}/year); anything over that is cut, and every food line is scaled to the cap. Menus must still meet the Missouri meal pattern (5 CSR 25-500.202: breakfast or AM snack, lunch and PM snack; milk with each meal; no more than four hours between). Toiletries and cleaning supplies fit within a {fmt(CLEANING_MONTH)}/month budget; with paper towels halved (bulk purchasing, existing inventory, no duplicate orders) the category totals {fmt(CLEANING_ANNUAL)}/year. Classroom and office consumables are halved for the same reasons, to {fmt(CLASSROOM_ANNUAL)}/year. Utilities (electricity, gas and water/sewer) are locked at {fmt(UTILITIES_MONTH)}/month ({fmt(UTILITIES_MONTH*12)}/year); internet, phones, waste and the rest of building operations are separate. Tax preparation is budgeted at $1,000/year. Curriculum mapping is a one-time {fmt(next(x['annual'] for x in lines if x['item'].startswith('Initial curriculum completion')))}, with no recurring curriculum fee; native Spanish curriculum review is a one-time {fmt(next(x['annual'] for x in lines if x['item']=='Native Spanish curriculum review'))}, with no recurring Spanish review. RN consultation is budgeted at {fmt(next(x['annual'] for x in lines if x['item']=='RN recurring consultation'))}/year. Administration is halved to {fmt(sum(D(x['annual']) for x in lines if x['category']=='Administration' and x['bucket']=='recurring'))}/year (part-time bookkeeper at half the original allowance, payroll service $840/year, no-fee bank account). Building upkeep is handled in-house: lawn, HVAC service, electrical maintenance, parking repairs and staff mobile lines are removed and snow service is halved. Food holds at the cap in every month of the enrollment ramp.
"""
body+=f"""
## Completion, curriculum and production
Platform completion is 380 estimated hours at $150/hour: $57,000, contingent on reusing working code. Inventory/deployment 20h; family/child consent and authentication 40h; CRM/ATS/store integration 25h; curriculum records and parent digest 60h; finite messages/QR 20h; bilingual review 25h; role/private-file security 65h; backup/restore/monitoring 40h; accessibility/iPad verification 35h; acceptance/training/launch 50h. These are scope allowances, not contractor quotes or the replacement value of past work. Six maintenance hours/month is a lean support allowance; escalation must be quoted.

Acceptance requires persistent child records, role isolation, private uploads, consent records, billing without duplicate charges, educator and native-Spanish approval, independent manual security testing and retest, successful offsite restore, real iPad/browser checks and a named support owner. Public pages and merged code alone do not establish readiness. Human-approved finite character messages support routines; no open-ended child chatbot or medical advice is assumed. State approval/accreditation must not be claimed without evidence.

Curriculum mapping (one-time; no recurring curriculum fee), teacher coaching, RN routine consultation and dietitian menu review are separately costed. Pilot content reuses the approved characters. The $3,000 generation allowance is a spend cap for a finite pilot library, not twelve seven-minute episodes. Price accepted-minute yield including rejected generations before funding a season. Scripts, education review, editing, captions, sound, licensing and creative lead fees remain separate.

Marketing is $6,000 local media + $1,800 management + $2,400 launch photography + $1,200 materials = $11,400 year one. Test tour-to-enrollment conversion and retention before raising spend. There is no national sales payroll, bulk tablet rental inventory or full-season production in this pilot.

Ralph's forward delivery ($12,000) and pilot-year creative oversight ({fmt(category_sum('Pilot content support'))}, one-time: a smaller release calendar with defined paid deliverables, not ongoing) are explicit. Existing platform/characters/CRM/ATS/video replacement value is not automatically a cash invoice. Reconcile prior scope, deliverables, payments, rights and outstanding fees before adding past compensation. Do not assume past work is free because its amount is unresolved.

## Release gates and missing evidence
First month: verify safe shift coverage, consent, activity records, billing, attendance and support response. Month three: compare actual collections, retention and acquisition costs against the model. Months six and twelve: expand only after positive ongoing cash economics and dependable delivery. Release engineering cash against accepted milestones.

Before a financing decision, obtain the actual age roster/room capacity/hours; existing staff and payroll; current signed tuition/discount policy; twelve months of bills and insurance; inventory/inspection findings; the purpose of $140,000 and lender closing/payment statement; engineering/clinical/production quotes; current tax treatment; and past creator fees/rights. No one can certify the present forecast as a profitable investment without those inputs.

Each cost row identifies its formula, source and whether it is a published price, tax formula or quote-required allowance. Cents make arithmetic reproducible; they do not imply receipt-level accuracy. No food reimbursement, grant, store profit or partner licensing receipt is assumed. Read the digital cost register, CSV and monthly cash table for the complete audit trail. The production bible and operations companion preserve brand and delivery scope; their future creative and expansion concepts remain outside pilot financing.
"""
body += "\n## Platform delivery: what the allowance buys\n\n"
platform=model['platform']
body += f"Year-1 platform allowance: {fmt(platform['first_year'])}. One-time completion and assurance: {fmt(platform['one_time'])}. Annual recurring service: {fmt(platform['recurring'])}, averaging {fmt(platform['monthly'])}/month. {fmt(platform['contingency_included'])} of platform contingency is already included in the overall contingency; do not add it twice.\n\n{platform['rate_basis']}\n\n"
body += "| ID | Item | Calculation | Amount | Timing | Why essential / delivery evidence |\n|---|---|---|---:|---|---|\n"
for row in lines[PS-1:PS+27]:
 body += f"| {row['id']} | {row['item']} | {row['quantity']:g} {row['unit']} × {fmt(row['rate'])} | {fmt(row['annual'])} | {row['bucket'].replace('_',' ')} | {row['purpose']} {row['deliverable']} |\n"
body += "\n"+platform['readiness']+"\n\nLaunch acceptance requires:\n\n"+"\n".join('- '+g for g in platform['gates'])
sc=platform['separate_costs']
body += f"\n\nCurriculum/clinical review ({fmt(sc['curriculum_clinical'])}), finite pilot content ({fmt(sc['pilot_content'])}), pilot-year creative oversight ({fmt(sc['creative_oversight'])}, one-time) and devices ({fmt(sc['devices'])}) are separately included in the overall budget. A full animated season, national rollout and open-ended child AI are excluded. Six monthly support hours are lean; incidents and larger changes may require additional quoted work. Ongoing tuition must cover recurring costs and debt after Year 1; "+('this platform allowance is already inside the recurring and one-time totals that the operating margin covers.' if margin>0 else 'this platform allowance does not resolve the current operating deficit.')+"\n"
(ROOT/'documents/Futures_Friends_CURRENT_Pilot_Business_Plan.md').write_text(body)
one=f"""# Futures Friends | 38-child pilot — investor one-sheet
One owned center in Independence, Missouri • Ages 2–5 • 38 children, all-day care • Twelve months • October 13, 2026 (model {model['meta']['version']})

Booker, Lumi, Zuri and Bop connect curriculum, movement, nutrition and family routines. The pilot proves the experience in one real center before licensing it elsewhere. Existing website, CRM, ATS, store and artwork are reused; working parent/child access, learning records, consent, billing and recovery controls must pass acceptance.

| Investor question | Direct answer |
|---|---|
| Staffing | Four full-time caregivers and a part-time relief floater, all at $16/hour, no employer health benefit; the owner serves as director, unpaid (market director ~{fmt(MARKET_DIRECTOR)} all-in excluded). Four caregivers on the floor in two groups of ≤20, valid with no more than four 2-year-olds per group. No food worker, no paid substitutes. Wages {fmt(WAGES)}. {ADDL_COVERAGE} |
| Annual operating cost | {fmt(rec)} recurring; continues in year two, before inflation and building payments. Owner-set budgets: food capped at {fmt(FOOD_CAP_MONTH)}/month (Missouri meal pattern still met); toiletries and cleaning within {fmt(CLEANING_MONTH)}/month ({fmt(CLEANING_ANNUAL)}/year, paper towels halved); classroom and office consumables halved to {fmt(CLASSROOM_ANNUAL)}/year; utilities locked at {fmt(UTILITIES_MONTH)}/month; tax preparation $1,000/year; curriculum mapping and native Spanish review one-time, no recurring curriculum or Spanish review fee; RN consultation $2,000/year; administration cut to $5,872/year; building upkeep handled in-house. |
| Platform delivery | {fmt(platform["first_year"])} Year 1: {fmt(platform["completion"])} completion + {fmt(platform["assurance_one_time"])} one-time assurance + {fmt(platform["recurring"])} annual services. Code audit, fixed-scope quote and working acceptance required. |
| Completion and launch | {fmt(once)} one-time. Includes $57,000 platform completion, curriculum/clinical review, finite content and security. Local marketing totals $11,400 year one. |
| Reserves | {fmt(cont)} contingency (15% of one-time spend) and {fmt(floor)} one-month working capital. No blanket unemployment reserve. |
| Building | $140,000 owner funding requirement enabling refinance; payoff, terms and new payment unverified. $700,000 placeholder removed. |
| Cash need | {fmt(model['funding']['request_before_financing'])} estimate = $140,000 + {fmt(peak)} peak pilot deficit + contingency + cash floor. Excludes unresolved mortgage/debt and past creator fees. Not a final loan ask. |
| Receipts | Owner-confirmed locked-in $210/week per child ($910/month via 52/12); 96% collection. Thirty-eight full-year places collect {fmt(revenue)} before discounts. |
| Repayment reality | Full-enrollment operating cash {fmt(margin)} before building/debt, with the owner as unpaid director. Break-even realized tuition {fmt(break_even)}/month before those payments. {'Positive before building payments and debt; the building payment and lender terms are unknown, so borrowing capacity is not established.' if margin>0 else 'Current case does not support borrowing; costs/tuition/funding must change.'} |
| Payback timing | {fmt(once)} one-time (months 1–{max(c['month'] for c in cash if c['one_time']>0)}) vs {fmt(rec)}/year recurring. Net cash positive from month {FIRST_POS}; cumulative pilot cash positive in month {CUM_POS} at the month-12 rate, before building payments and debt. |
| Investor terms | No permanent equity. Payment capacity follows cash after operations and building payment, with a 1.25 coverage screen. Terms/collateral/guarantees require an offer. |
| Control | Accepted build milestones; consent/role/billing tests; security retest; offsite restore; educator/Spanish approval. Reviews at months 1, 3, 6 and 12. |
| Deferred | National operations, full animated season, bulk family tablets and unsigned licensing income. |

Before agreement: verify child ages, staffing/hours, tuition and discounts, operating bills, building/lender statement, bids, insurance, tax status and creator compensation/rights. Each price and evidence basis is inspectable in the digital cost register. A pilot reduces execution risk; it does not eliminate the need for positive recurring economics.
"""
(ROOT/'documents/Futures_Friends_CURRENT_Pilot_One_Sheet.md').write_text(one)
# Older document names kept as exact copies so existing links resolve to the current model (never a stale copy).
for alias in ['Investor_Business_Plan','Loan_Pricing_Rationale','Forecast_and_Production_Reconciliation']:(ROOT/f'documents/Futures_Friends_CURRENT_{alias}.md').write_text(body)
(ROOT/'documents/Futures_Friends_CURRENT_Investor_Executive_One_Sheet.md').write_text(one)
print(json.dumps(dict(lines=len(lines),**model['totals'],**model['funding'],**model['metrics']),indent=2))
