# Futures Friends
## Current Operations, Platform & Partner Companion

**Status:** Current working operations master | **Prepared:** <!-- model:prepared -->13 October 2026 (model pilot-38-v5.1)<!-- /model:prepared -->  
**Scope:** one pilot location, children ages 2–5, bilingual family-learning program, adult-mediated digital platform, and staged partner expansion.

> This is an operating design and acceptance plan. It does not claim that every service is hosted, approved, accredited, staffed, or production-tested today.

## 1. Operating promise

Futures Friends gives a daycare, church program, home daycare, or family a coherent way to connect short stories with classroom practice, movement, food language, family take-home work, and child development observation. The operating loop is **Watch, Talk, Do, Play, Reinforce, Take Home**.

The first operating case is one pilot location serving ages 2–5. Expansion to additional centers, churches, and family settings is staged only after the pilot demonstrates safe delivery, repeatable onboarding, usable data controls, family engagement, and a support cost the business can carry.

## 2. Daily implementation

A center adapts the day to its license, staffing, ratios, meals, naps, weather, accessibility needs, and local rules. Futures Friends supplies a program layer, not a replacement for licensing or supervision.

| Block | Staff action | Child route | Record |
|---|---|---|---|
| Arrival | Greet, visual choice, transition support | Choose, observe, communicate | Support note if needed |
| Connection | Preview schedule and weekly idea | Point, sign, speak, move, listen | Access/interest note |
| Short story | Show accepted media or use live retelling | Watch, predict, imitate, opt out | Version used |
| Talk/do | Offer object or picture; wait | Build, sort, compare, tell, show | Factual observation |
| Movement | Offer active and adaptive versions | Move, direct, reach, drum, rest | Adaptation note if needed |
| Meal | Serve safely; honor refusal | Choose, name, pass, taste or observe | Menu, allergy, temperature records |
| Zones | Open connected materials | Repeat idea through play | Material/incident records |
| Closing | Revisit change and choose take-home cue | Show, tell, point, mark | Family cue |

Two-year-olds may use objects, puppets, cards, songs, and live retelling without being put on the older-child video rhythm. Screens are short invitations used with an adult, never unsupervised childcare.

## 3. Role-based platform requirements

The digital platform becomes high-value when each user sees only the work and records needed for that role. It must enforce permissions on the server and database, not only hide buttons in the browser.

### Student/Kid Mode

An adult links the child profile. The child sees assigned curriculum work, approved media, activities, and finite character messages. The exit gate returns to an adult-controlled flow. The system records completion and progress without turning a preschool child into a public profile. No open-ended child AI is part of the approved scope.

### Parent/family portal

The family sees consent status, child linkage, assignments, weekly digest, messages, progress, home activities, bilingual settings, and support contact. The parent can review or request correction, export, or deletion according to the privacy policy and applicable law.

### Teacher portal

Teachers see their assigned roster, current lesson sequence, observation notes, activity prompts, meal/movement connections, and family communication tools. They cannot see director-only financial records or another tenant’s data.

### Director portal

Directors manage enrollment, staff invites, schedules, curriculum assignments, reports, billing view, and center settings. Director actions need an audit trail and least-privilege defaults.

### Support/HQ and partner portals

Support sees the minimum needed to resolve a ticket. HQ analytics are aggregate unless a documented support need requires tenant-level access. Future church/daycare partners receive their own tenant, kit catalog, onboarding, training, support, and renewal view.

## 4. Data, privacy, security, and resilience

The platform handles child, family, staff, consent, attendance/progress, photos or media, messages, billing, and support records. Launch readiness requires:

- tenant isolation tested with two fake centers and role accounts;
- database row-level security verified for every table;
- server-enforced Kid Mode and family linkage;
- secure invite, reset, session expiry, rate limits, and audit logs;
- private file storage and expiring access for sensitive media;
- secret management with no service keys in public code;
- retention, deletion, export, consent, and incident response procedures;
- encrypted backups, restore test, recovery owner, and recovery-time target;
- staging data only for security testing;
- accessibility, responsive, iPad/Safari, performance, and network testing;
- independent web/API/cloud security assessment before serious partner claims.

A local preview, passing agent test, or GitHub Pages deployment does not prove a hosted, persistent, secure school platform. The release record must identify what was tested, on which environment, with what data, and who accepted it.

## 5. Curriculum and educator operations

The current library describes 12 units, 48 theme weeks, 27 family activities, 17 printables, and 37 internal training modules. These are inventory counts. Units, Spanish materials, training modules, and printables remain draft or review status until an educator owner accepts them.

Every week has one story idea, one concrete activity, one movement route, one food or sensory connection where appropriate, one family cue, and an observation prompt. The adult records what the child did and what support helped. No child is ranked.

Educator onboarding uses orientation, classroom foundation, lead practice, director operations, kitchen practice, and internal coach/trainer stages. Completion means the adult can perform the routine safely and explain the boundary between program guidance and local licensing, health, food, and emergency requirements. Futures Friends training is not called state-approved credit or certification without documented approval.

## 6. Meals and movement controls

The Eat the Rainbow framework includes color language, family-style participation, recipes, menus, shopping and prep guidance, and child-safe jobs. A qualified food lead must approve ingredients, allergen controls, texture, choking preparation, substitutions, temperatures, portions, and applicable meal-program crediting before service. A nurse or health reviewer can review the framework; that review is not medical clearance or accreditation.

Movement includes Turtle Tempo, Sun Stretch, Heart Hands, transitions, outdoor play, carrying, rhythm, and adaptive options. Staff offer seated, visual, AAC, mobility-device, and low-stimulation routes. They do not force contact, stretching, breathing, balance, or taste.

## 7. Tablet and merchandise operations

<!-- model:tablets -->The pilot models 8 school-owned classroom tablets with a 10-device management minimum; a family tablet program is a Phase 2 planning assumption.<!-- /model:tablets --> A candidate device would be locked to Kid Mode, remotely managed, paired by adult QR flow, branded with approved characters, and remotely wipeable. The program needs device inventory, repair, loss, rental/sale terms, consent, privacy notices, support scripts, and return procedures.

Merchandise includes branded learning-zone carpets, posters, cards, books, apparel, cases, and future plush. Every product requires approved art, trademark review, supplier sample, safety documentation, costed landed price, inventory owner, fulfillment plan, and return/support process. A concept image is not a sellable product.

## 8. Partner onboarding and service model

A daycare or church partner receives discovery, readiness review, agreement, tenant setup, staff roles, privacy/consent setup, curriculum orientation, kit selection, pilot week, support channel, usage review, and renewal conversation.

### Onboarding gates

1. Signed scope, pricing, privacy responsibilities, and decision owner.
2. Center license, staffing, ages served, hours, meal and emergency constraints recorded.
3. Tenant, roles, consent, bilingual preference, and data-retention settings configured.
4. Staff orientation and safeguarding review completed.
5. Materials, media, zones, and family communication accepted.
6. Pilot week observed; incidents, access barriers, and support requests logged.
7. Director signs operational acceptance or records the remediation plan.

Partner revenue, church expansion, licensing, merchandise, tablets, subscriptions, and training are future opportunities until written agreements, deposits, invoices, or renewal evidence exist.

## 9. Support and service levels

The initial support queue needs a named owner, monitored inbox, ticket category, severity, response clock, escalation path, and closure record. The suggested operating target is acknowledgement within one business day, subject to staffing and a published support commitment. Critical child-safety, privacy, or service outage issues escalate immediately through the center’s emergency and incident process.

Support knowledge should include family login, staff invite, Kid Mode pairing, assignment/progress questions, bilingual content, device loss, media accessibility, billing, returns, and privacy requests. Every resolved ticket becomes a reusable support article only after human review.

## 10. Content and production intake

No episode, character message, printable, Spanish line, QR habit card, or merchandise file enters release without an owner, source/provenance record, rights status, developmental/safety review, accessibility check, and acceptance date. The production Bible controls canon, voice, gestures, visual continuity, episode status, and release package.

**Forward production boundary:** the national 12-episode / seven-minute season, related bulk tablet rollout, national marketing and partner expansion are Phase 2. The current pilot includes a finite $3,000 generation cap for pilot assets; it is not a quote to produce a complete season. The Higgsfield account audit records observed mixed-project activity and must remain separate from the pilot allowance. A future season budget requires an approved schedule, vendor quotes, rights, voice, bilingual adaptation, captions, editing, review, storage and delivery.

Approved finite character messages may cover handwashing, cleanup, kindness, asking for help, movement, and transitions. Messages are adult-selected or assigned. They do not diagnose, shame, threaten, make promises, or improvise beyond the approved library.

## 11. Financial linkage and procurement controls

The current gross model is linked to `investor/costs/pilot-budget.json`, <!-- model:lines -->the 234-line itemized CSV<!-- /model:lines --> and the current workbook. Every line carries an item, quantity, rate, formula, bucket, evidence basis and source URL where one exists. Published references, supplier quotes and planning allowances remain distinct; a price with cents is not proof of a quote or payment. Each line must carry category, purpose, quantity, unit price, tax/shipping treatment, source or assumption, owner, timing, vendor/quote status, and acceptance evidence.

Before purchase: approve scope, validate quantity, obtain a quote or document the assumption, confirm delivery and acceptance criteria, assign budget owner, and record the invoice/payment. After delivery: inspect, record serial/license/asset data, attach acceptance evidence, and update forecast.

<!-- model:finance -->
The pilot package does not propose a fixed loan amount or promise repayment. The current planning case is a one-location, 38-child, 12-month pilot (model pilot-38-v5.1): $286,007.37 recurring cost, $142,554.00 one-time cost, $21,383.10 contingency, and $449,944.47 gross year-one requirement including contingency. The separate $140,000 owner-stated refinance-enabling need and the $295,254.96 planning cash estimate before financing are not approved or financeable loan amounts. The model shows a $110,037.91 peak deficit and a $23,833.95 cash floor. The owner serves as director, unpaid; 4 full-time caregivers and 1 part-time floater are paid $16/hour, with 4 caregivers on the floor in 2 groups of no more than 20. Any additional classroom coverage beyond the four caregivers and floater is provided by the owner-director and a head of administration at no added payroll cost (owner, 2026-10-13). Anyone counted in ratio keeps Missouri records on file: background check, medical/TB report, orientation, 12 annual training hours (5 CSR 25-500.102, .122). Owner-set budgets: food and nutrition is capped at $2,000.00/month, with menus still meeting the Missouri meal pattern; toiletries and cleaning stay within $300.00/month ($3,110.18/year with paper towels halved); classroom and office consumables are halved to $1,599.87/year; utilities (electricity, gas, water/sewer) are locked at $1,500.00/month; tax preparation is $1,000.00/year; curriculum mapping is $7,500.00 one-time, and native Spanish review is $1,500.00 one-time, with no recurring curriculum or Spanish review fee; RN consultation is $2,000.00/year; administration is cut to $5,872.00/year (part-time bookkeeper); building upkeep is handled in-house (lawn, HVAC service, electrical, parking and staff mobile removed; snow halved). At the locked-in $210/week ($910/month) tuition and 96% collection, year-two operating margin is $112,354.23 before building payment or debt, and operating break-even is $651.16 tuition per child per month. The building payment and lender terms are unknown, so no loan affordability or profit after debt is claimed. Net cash turns positive in month 5; cumulative pilot cash turns positive in month 17 at the month-12 rate, before building payments and debt. No equity is offered; any debt terms require verified operating evidence and a written lender offer.
<!-- /model:finance -->

## 12. Staffing and accountability

The operating plan needs named owners for creative/canon, production, curriculum, bilingual review, health/food, engineering/security, operations, family support, finance, and counsel. A title without a person, scope, hours, rate, start date, or acceptance deliverable is not a staffed role.

The founder owns mission and final creative decisions. The production lead owns schedule and vendor handoffs. Curriculum and bilingual leads own educational and language acceptance. Health/food reviewers own their professional scope. Engineering owns platform and security evidence. Operations owns center delivery, support, inventory, and partner onboarding. Finance owns every model line and cash forecast. Counsel owns contracts, privacy, employment, licensing, and financing terms.

## 13. Expansion and residual opportunities

Expansion should follow evidence, not aspiration:

1. Pilot center ages 2–5 proves routines, support burden, family engagement, and safe data handling.
2. A second daycare or church pilot tests partner onboarding and tenant isolation.
3. Partner kits, training, subscriptions, merchandise, QR habit packs, tablets, and licensing are priced from actual support and fulfillment cost.
4. Multi-site reporting, renewals, and aggregate outcomes are added only after the operating model is repeatable.

Potential recurring or residual revenue includes center/platform subscriptions, church and daycare implementation fees, staff training, curriculum refresh, family memberships, device rental/management, device sales, learning-zone kits, branded merchandise, books/cards, licensing, production services, and approved partner programs. None should be included as secured receipts without evidence.

## 14. Acceptance register

| Gate | Evidence required | Owner | Status |
|---|---|---|---|
| Pilot scope | Signed location/ages/hours/staff assumptions | Operations | Open until signed |
| Platform hosting | Production URL, environment record, monitoring | Engineering | Open until verified |
| Role isolation | Two-tenant and role test report | Security/engineering | Open until retested |
| Curriculum | Educator review and approved release manifest | Curriculum lead | Draft/review |
| Spanish | Native educator review and approved line sheet | Bilingual lead | Draft/review |
| Health/food | Professional review, allergy and menu controls | Health/food lead | Scope-limited |
| Content | Script, animatic, render, captions, rights, safety | Production | Episode 101 pending |
| Tablets | Device sample, MDM, pairing, wipe, safety, terms | Operations/engineering | Planning assumption |
| Merchandise | Supplier sample, safety, landed cost, fulfillment | Product/ops | Proposed |
| Finance | Quote/assumption ledger and cash forecast | Finance | Gross model reconciled; receipts, staging, and financing-cost validation pending |
| Partner launch | Training, pilot observation, acceptance sign-off | Partner success | Future |

## 15. Source and contradiction map

| Topic | Current source | What it proves | What it does not prove |
|---|---|---|---|
| Public offer and family pages | Current Futures Friends website | Published positioning and visible content | Hosted LMS, persistence, accreditation, or signed demand |
| Character and production canon | Current production Bible and restored Bible content | Names, pillars, story engine, gates | Finished animation or cleared rights |
| Education and kitchen | Operations and education companion sources | Working routines and frameworks | State approval, CACFP certification, medical advice |
| Platform claims | Local Hub/site work and audit notes | Implemented or previewed components where specifically evidenced | Production hosting, all-browser acceptance, security attestation |
| Costs | Full Cost Model JSON, workbook, CSV | Itemized planning prices and evidence basis | Vendor quotes, invoices, funding availability |
| Financing | Financial reconciliation | Proposed amount and gross model relationship | Agreed lender terms, receipts, repayment offer |
| Historical PDFs | Original 35-page Bible and 117-page companion | Prior depth and source history | Current status when contradicted by this master |

## 16. Open decisions before investor or partner commitments

- Confirm the cash forecast and whether scope is staged to the proposed loan.
- Obtain quotes for allowance lines and distinguish quotes from published prices.
- Decide the first hosted production environment and complete role/persistence/backup testing.
- Name professional reviewers and record their exact scope.
- Lock Episode 101 script, timing, voice, art, rights, and bilingual lines.
- Decide the tablet model, management provider, safety documentation, and rental/sale terms.
- Approve partner pricing only after pilot support and fulfillment cost are measured.
- Keep all historical financing scenarios visibly superseded.

This companion is ready for visual integration once the owners above convert the open gates into dated evidence.

## Current production-finance control note

Before batch production, approve a seven-minute episode, two QR clips and one bilingual promo. Record accepted-shot yield, rights, review and complete finishing costs. The [account audit](https://dvolcore.github.io/futures-friends/investor/costs/Higgsfield_Actual_Usage_Audit.md) and [budget reconciliation](https://dvolcore.github.io/futures-friends/investor/costs/Animation_Budget_Reconciliation.md) distinguish observed usage from planning allowances.
