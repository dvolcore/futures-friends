# Futures Friends investor overview

Open `index.html` first. The branded overview connects the funding breakdown, pilot scope, platform build, operating gap, curriculum concept, phase navigation, line-item costs, documents and current PDFs. Open `pilot-plan.html` for the active model and `pilot-one-sheet.html` for the investor summary. All package links are relative; research links need internet access.

The overview reads the current pilot model, flags failed data loads, and supports reduced motion. The suited character artwork and curriculum image are presentation concepts, not evidence of an installed classroom or approved curriculum. Loan terms and monthly repayment remain pending; the overview does not invent an investor return or conceal the pilot-year cash deficit.

## Current financial basis — model pilot-38-v5.2, October 13, 2026

One owned Independence, Missouri location, 38 children ages 2–5 in all-day care, twelve operating months, and a first-month operational checkpoint. Four full-time caregivers and a part-time floater, all at $16/hour; the owner serves as director, unpaid; no food worker, no paid substitutes. Owner-set budgets: food capped at $2,000.00/month (Missouri meal pattern still met); toiletries and cleaning within $300.00/month ($3,110.18/year with paper towels halved); classroom and office consumables halved to $1,599.87/year; utilities locked at $1,500.00/month; tax preparation $1,000.00/year; curriculum mapping $7,500.00 and native Spanish review $1,500.00, one-time, with no recurring curriculum or Spanish review fee; RN consultation $2,000.00/year; administration cut to $5,872.00/year (part-time bookkeeper); building upkeep handled in-house (lawn, HVAC service, electrical, parking and staff mobile removed; snow halved). Four caregivers on the floor in two groups of no more than 20 holds only with no more than four 2-year-olds per group (5 CSR 25-500.112). Confirm the actual age mix, license, rooms and schedule before accepting this roster.

The owner-confirmed, locked-in $210/week ($910/month) tuition and 96% collections produce a positive annual operating margin of $112,354.23 before the building payment or debt, with the owner as unpaid director; that is not proof of loan affordability. The cost estimate is not an approved loan ask. The owner specifies $140,000 to enable refinancing; the new building payment, lender terms and closing costs still require documents.

Debt capacity uses cash after continuing operating costs and the building payment. Missing building-payment information blocks the affordability conclusion; it is not treated as zero. The calculator shows cash after entered debt and warns when the payment exceeds the modeled limit. Rates and terms are illustrative, not an offer.

## Active sources

- `../costs/pilot-budget.json` and `model/pilot-budget.json`: identical model records.
- `../costs/Pilot_38_Children_Itemized.csv`: 234 individually priced planning lines, evidence links and quote requirements.
- `../costs/Pilot_38_Children_Monthly_Cash.csv`: staged operating/setup cash forecast.
- `../documents/Futures_Friends_CURRENT_Pilot_Business_Plan.md`: current narrative.
- `../documents/Futures_Friends_CURRENT_Pilot_One_Sheet.md`: current summary.
- `../Futures_Friends_CURRENT_Pilot_Business_Plan.pdf`: current branded pilot business plan.
- `../Futures_Friends_CURRENT_Pilot_One_Sheet.pdf`: current one-page PDF.

Published prices, owner inputs and allowances are distinct. No supplier quotation or audited financial statement is implied. Building payments, refinance points, historical creator fees and other open evidence remain unresolved rather than silently priced at zero.

## Scope and historical references

Pilot scope includes completion of the existing website, CRM, ATS, store, family/child permissions and activity records; finite approved character messages; curriculum, clinical review, bilingual materials, backups, security and local enrollment marketing. Eight classroom devices are modeled, with a ten-device management minimum. National sales, franchise tooling, bulk family tablets and the full 12-episode season are Phase 2 and excluded from current pilot financing.

Superseded financial views have been retired. Legacy page and PDF links now resolve to the current pilot. Production and operating references retain creative depth, with future scope explicitly outside pilot financing.

Publication verifies accessibility of package files, not operational hosting, privacy clearance, signed enrollment, current collections or repayment capacity. Obtain actual operating records, written quotes, lender terms and professional review before funding.

## Investor portal layer (October 12, 2026)

`portal.js`, `portal.css` and `portal-i18n.js` sit on top of the overview without changing a figure: the Futures Hub one-card-at-a-time count-up with neon rings and bars (skippable; final values under Reduce Motion, the site's Decorative motion switch, "Pause motion" and `?reveal=off`), "Show as table" on every chart, the documents drawer (`?doc=<id>`, sizes and pages from `../publication-manifest.json`), English / Español (draft Spanish; English governs) and a link home. The site's Sign in / Portals menu opens this page (`hub-link.js`). After any change under `investor/`, run `python3 investor/tools/refresh_manifest.py`. Tests: `tests/investor-portal.test.js` (figures compared with `tests/fixtures/investor-numbers.json`, recorded before the portal work).
