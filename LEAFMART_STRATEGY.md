# LeafMart Strategy — the e-commerce sibling

**Status:** Direction-setting. This document captures the conversation with
Pam (former ~$4B / 20-dispensary operator, Europe contacts) and Scott's
decision to spin LeafMart out as a separate product from the Leafjourney
EMR. It is the canonical source for "why are we building a second
website?" and frames the Drop #11 ticket backlog (EMR-231..EMR-257).

## The conversation

Pam identified an unmet need at the intersection of our three moves:

1. **EMR** — Leafjourney is the clinical hub. HIPAA-bound PHI infrastructure.
2. **E-commerce** — there's no trusted, curated, evidence-backed Amazon for
   cannabis. The existing storefronts (Weedmaps, Leafly) are directories,
   not merchandised experiences. Nobody ties purchasing to outcome data.
3. **Education** — patients and consumers have nowhere to go that answers
   "what should I actually buy for my insomnia / anxiety / pain?" with
   peer-reviewed backing AND a path to purchase.

The gap is the combination. Pam's read: a LeafMart that fuses a
merchandised catalog with the Leafjourney education layer (phytocannabinoid
wheel, ChatCB, dose-log + emoji outcome capture) can stand up fast, make
revenue fast, and reinvest into the EMR. She has the operator experience,
the regulatory relationships, and the European contacts to accelerate it.

## Why LeafMart is a separate product

The EMR is HIPAA-bound PHI infrastructure. An e-commerce site touching
cannabis product sales is exposed to DEA, FDA, FCC, state licensing, and
(crucially for the next 90 days) an open federal question about hemp and
Farm Bill reauthorization. If LeafMart gets an enforcement action, the
blast radius must not take the EMR down with it.

Architecture implication:

- Separate domain: **www.leafmart.com** (not a subdomain of leafjourney).
- Separate infra tenancy: separate cloud project / DB / payment processor
  / logs / secrets store.
- Separate legal entity if legal recommends (TBD — Pam + counsel).
- Narrow linking API between LeafMart and Leafjourney: opt-in, explicitly
  scoped, audited, and terminable from either side without data bleed.

The EMR remains the main hub. Data flows are **LeafMart → Leafjourney**
when a consumer chooses to link accounts. A LeafMart customer who never
links has no clinical footprint; a Leafjourney patient who links inherits
their purchase and dose-log history into their chart.

## What LeafMart looks like

- **Homepage + age gate.** "Are you 21+?" Yes → store. No → redirected to
  Leafjourney landing.
- **Catalog.** Products we curate and trust. Each tile: image, primary
  phytocannabinoids, one-sentence description, format (edible / tincture /
  flower / topical / vape), price, vendor link.
- **Filters.** Price band, format, cannabinoid profile (THC / CBD / CBG /
  combo), terpene profile, medical vs recreational-state eligibility,
  condition ("insomnia / anxiety / pain").
- **Education surface.** Phytocannabinoid wheel, ChatCB search, research
  library, "how to know what product to buy?" guide — mirrors Leafjourney
  education content.
- **Dosing plan.** Per-user, AI-generated, peer-reviewed-backed dosing
  suggestions in multiple formats assuming naive user. Takes the
  confusion out.
- **Leaf rating.** Our native 5-leaf rating (not Amazon stars) with
  prompted outcome check-ins ("did this help your sleep? anxiety?
  stress?"). Ratings feed the evidence engine for future recommendations.
- **Login + account.** Optional. Anonymous shopping supported. Logged-in
  users get dose plans, purchase history, digital receipts, and the
  option to link to a Leafjourney record.
- **Checkout.** Direct transaction with LeafMart (cannabis-friendly
  merchant processor). Vendor fulfills from their own inventory; LeafMart
  takes a commission. Both parties get the invoice.
- **Tax + reimbursement.** Year-end invoice aggregating all cannabis
  purchases: product, vendor, price, state, date. PDF downloadable for
  tax and insurance reimbursement submissions.

## Leafjourney ↔ LeafMart integration surface

Narrow, explicit, auditable. Four contracts:

1. **Account linking.** OAuth-style consent flow. Consumer at LeafMart
   opts in to link a Leafjourney patient record. Link is revocable from
   either side. No data flows before consent.
2. **Purchase → chart sync.** Linked consumers' purchases land in the
   Leafjourney chart as documented products. Clinician can opt into
   dose-log prompts tied to purchase events.
3. **Outcome + dose-log mirror.** Linked users can log doses on either
   site; the data goes to one source of truth and is visible in both.
4. **Insurance reimbursement path.** Leafjourney generates the ICD-10-
   backed claim packet when a purchase is flagged for CMS/Medicare
   reimbursement submission. EOB returns to the Leafjourney patient
   portal.

De-identified LeafMart data also feeds Leafjourney's research + cohort
analytics so population-level patterns (which products help which
conditions at which doses) get stronger over time.

## Revenue model

LeafMart takes a commission on each sale — percentage set by C-suite,
adjustable per vendor class. Revenue flows:

- LeafMart operating costs (infra, compliance, ops)
- Vendor payouts (net of commission)
- **Reinvestment into Leafjourney EMR** — explicit line item so the EMR
  gets funded from e-commerce profits while we're pre-revenue on the
  clinical side.

Vendor dashboard (a core deliverable): traffic to their listings, units
moved, revenue generated, commission paid. Transparent enough that
vendors want to be on the platform.

## Timeline urgency — the November hemp ban

A Farm Bill reauthorization question is live. A significant tightening
on hemp-derived cannabinoids is a real outcome some time in the next
90 days. If that happens:

- A large swath of the hemp industry goes dark overnight.
- Consumers who relied on those products need a trusted place to find
  what's still legal in their state.
- Operators who are structured for compliance win share.

Pam's offer is to help structure LeafMart for that world — FDA, FCC,
DEA, state licensing relationships — so we are positioned as the
compliant default, not scrambling to catch up after the ban drops. That
opportunity is time-boxed. If we're not live before the regulatory
event, the leverage is gone.

## Open questions (for tomorrow's call)

These belong in the call, not in tickets yet:

1. **Entity structure.** Does LeafMart need a separate LLC? What does
   counsel recommend given the EMR's HIPAA posture?
2. **Payment processing.** Which cannabis-friendly bank/processor is
   Pam recommending? What's the KYC timeline?
3. **Launch scope.** Which 3–5 vendors are the beachhead? California
   first (Pam's territory) or multi-state from day one?
4. **European path.** Pam's contacts are real — is Europe Phase 2 or
   parallel from the start?
5. **LeafJourney store sunset.** There's already a Leafjourney store
   module. Do we migrate it into LeafMart and redirect, or let
   Leafjourney's store atrophy?
6. **Brand cohesion vs separation.** How similar do the two sites look?
   Pam framed it as "similar enough for brand cohesion, different enough
   that the EMR doesn't get dragged into an e-commerce enforcement
   action." That's a design call that needs a frame.
7. **EMR reinvestment cadence.** Monthly sweep? Quarterly? Triggered by
   revenue milestone?

## How this document maps to the backlog

Everything below is a ticket. See `TICKETS.md` EMR-231..EMR-257. Each
ticket notes which side (EMR-only, LeafMart-only, or shared) and which
part of the strategy it executes on.

EMR-side tickets are mostly clinical: lab sets, prior-auth automation,
AI insurance mediator, phone-tree navigator, insurance directory.
LeafMart-side tickets build the marketplace from zero: domain + infra,
age gate, catalog, filters, leaf ratings, vendor dashboard, compliance
pipeline, supply chain API. Shared tickets (legal disclaimer,
dispensary registry, state regulation table, evidence-backed dosing,
education mirror) live once and are consumed by both.

`LEAFMART_PROMPT_SHEET.md` preserves the verbatim prompts Scott sent so
nothing gets lost in translation when the tickets get implemented.
