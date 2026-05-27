# Night Shift Phase 7 — The Endgame (100 Ticket Mega-Batch)

This file contains the track assignments and system prompts for the final Phase 7 development sprint. We are processing the remaining ~80-100 tickets in 8 parallel, collision-free tracks.

## Agent Invocation Instructions
Open 8 separate terminal windows (or tabs) and run `claude` in each.
Assign each agent a track by pasting their respective track assignment below into the chat.

---

### Track 1: The UI/UX Consolidation Pass
**Agent Prompt:**
> You are the Phase 7 Track 1 Agent. Your objective is purely frontend UI/UX consolidation. Do not modify backend Prisma schemas or server-side billing logic. Focus on reducing clicks, consolidating ribbons, and polishing the patient-facing layouts.
> 
> **Tickets to complete:**
> EMR-205: P1 BUG — Patient Portal Stuck on Loading Skeleton (`/portal`)
> EMR-117, EMR-118: iOS App Portrait Mode Nav Fix, Active Nav Tab Highlighting
> EMR-119, EMR-124: Tab Consolidation — Reduce Patient Chart Tabs, Nav Tab Reduction Proposal
> EMR-193 to EMR-196: Rename Tabs ("My Garden", "My Records", "Log Check-in")
> EMR-197 to EMR-200: Messages UI, Q/A Tab Ribbon removal, Account Ribbon, Chat & Learn UI
> EMR-201 to EMR-204: Cannabis Combo Wheel Colors, Kander PDF link, Trifold Guide, Landing Page Fixes
> 
> Check out a branch `scwayman/track-7-ux-consolidation` from `main`. Write code, test, and generate a PR when finished.

### Track 2: The AI Scheduling Engine
**Agent Prompt:**
> You are the Phase 7 Track 2 Agent. Your objective is building the advanced scheduling algorithms and backend data structures for predictive scheduling, waitlists, and group visits.
> 
> **Tickets to complete:**
> EMR-206: Self-Serve Online Scheduling
> EMR-207: No-Show Prediction Model + De-Risking
> EMR-208: Algorithmic Follow-Up Cadence per Condition
> EMR-209: Smart Slot Recommender
> EMR-210: Intelligent Waitlist + Cancellation Fill
> EMR-211 to EMR-215: Multi-Channel Reminder Orchestration, Group Visit + Block Scheduling, Provider Preference Engine, Scheduling Analytics
> 
> Check out a branch `scwayman/track-7-scheduling-engine` from `main`. Use `prisma db push` locally to test schema changes but be extremely careful with migrations. Generate a PR when finished.

### Track 3: EDI & Claim Generation (Clearinghouse)
**Agent Prompt:**
> You are the Phase 7 Track 3 Agent. Your domain is the strict ANSI X12 v5010 payload generation, clearinghouse integration, and payer rules database.
> 
> **Tickets to complete:**
> EMR-216: Real EDI 837P generator
> EMR-217: Clearinghouse gateway client (Availity / Waystar)
> EMR-218: Payer rules → DB model + admin editor
> EMR-219: Secondary claim filing (Loop 2320 CAS)
> EMR-220: Provider + Organization NPI + Tax ID schema
> EMR-222: Full NCCI / MUE reference table
> 
> Check out a branch `scwayman/track-7-edi-claims` from `main`. Build robust unit tests for your EDI generator. Generate a PR when finished.

### Track 4: Financial Operations & Lockbox
**Agent Prompt:**
> You are the Phase 7 Track 4 Agent. Your domain is financial operations: processing ERAs, lockboxes, statements, and payment plans.
> 
> **Tickets to complete:**
> EMR-221: ERA / 835 raw-file ingestion pipeline
> EMR-223: Per-payer contract allowable tables
> EMR-224: Lockbox / bank deposit matching
> EMR-225: Patient statement auto-generator + e-delivery
> EMR-226: Payment plan engine + card-on-file autopay
> EMR-227 to EMR-230: NSF handler, Appeal tracker, Prior-auth workflow, RCM daily-close report
> 
> Check out a branch `scwayman/track-7-financial-ops` from `main`. Work strictly in `src/lib/billing` and `src/app/(operator)/ops`. Generate a PR when finished.

### Track 5: Patient Finance & Access
**Agent Prompt:**
> You are the Phase 7 Track 5 Agent. Your domain covers the patient portal financial tools, access logs, and specialized portals (Researcher).
> 
> **Tickets to complete:**
> EMR-111, EMR-112: Cannabis Education DB, Medication Wallet Card
> EMR-113, EMR-114: Allergies Tab, ACH/CC Payment Storage
> EMR-115, EMR-116: EOB Into Portal, International Billing Framework
> EMR-120, EMR-121: Medicare RPM Integration, Master Access Log + Analytics
> EMR-122, EMR-123: In-App Translation, Researcher Portal
> 
> Check out a branch `scwayman/track-7-patient-access` from `main`. Generate a PR when finished.

### Track 6: The "Seed Trove" Rebrand & Loyalty
**Agent Prompt:**
> You are the Phase 7 Track 6 Agent. Your domain covers the patient gamification logic, provider CME credits, and the rebrand of certain features to the Seed Trove lexicon.
> 
> **Tickets to complete:**
> EMR-314: Rebrand to "Seed Trove" / nurture-harvest-fruit lexicon
> EMR-313: Loyalty/points system + gift cards
> EMR-125: Volunteer & Donation Module
> EMR-126: Provider CME Credits via Research Searches
> EMR-127: Leafjourney Charitable Fund + Transparent Ledger
> EMR-128: Universal Feedback Icon
> 
> Check out a branch `scwayman/track-7-seed-trove-loyalty` from `main`. Generate a PR when finished.

### Track 7: Leafmart Marketplace & Growth
**Agent Prompt:**
> You are the Phase 7 Track 7 Agent. Your domain is the massive consumer storefront (Leafmart), B2B vendor features, and SEO/conversion.
> 
> **Tickets to complete:**
> EMR-302, EMR-303: Distributor model + Rival Amazon benchmark
> EMR-305 to EMR-307: Product Q&A tab, Reviews with photos, AI-curated Product Details
> EMR-310: Checkout Compare sim
> EMR-315: Vendor tax docs + analytics dashboards
> 
> Check out a branch `scwayman/track-7-leafmart-growth` from `main`. Generate a PR when finished.

### Track 8: Education & AI Guardrails
**Agent Prompt:**
> You are the Phase 7 Track 8 Agent. Your domain covers strict AI safety constraints, clinician directories, and proprietary 42-hour medical cannabis curriculum deployment.
> 
> **Tickets to complete:**
> EMR-312: Proprietary cannabis education curriculum (≥42 hrs, CME)
> EMR-308: AI Share button + multi-platform sharing
> EMR-309: "Ask Cindy" highlight chatbot
> EMR-311: Clinician application + directory
> EMR-304: AI agent differentiation guardrail questions
> 
> Check out a branch `scwayman/track-7-education-guardrails` from `main`. Generate a PR when finished.
