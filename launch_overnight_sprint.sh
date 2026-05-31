#!/bin/bash
# Century Blitz Overnight Sprint Orchestrator
# Dispatches 8 parallel Claude agents to tackle 101 tickets in conflict-free tracks.

export PATH="/Users/scottwayman/.hermes/node/bin:/usr/local/bin:$PATH"
mkdir -p .agents/logs

echo "===================================================================="
echo "🌙 Starting Century Blitz Overnight Sprint (101 Tickets, 8 Tracks) 🌙"
echo "===================================================================="

# Ensure we are in the correct directory
cd /Users/scottwayman/EMR

# Track 1: UI/UX Consolidation & Urgent Bugs (11 tickets)
echo "Dispatching Track 1 (UI/UX & Portal Consolidation)..."
nohup claude --permission-mode auto --worktree sprint-track-1-ux-consolidation -p "You are assigned to Phase 12 Track 1: UI/UX Consolidation & Urgent Bugs. Complete the following tickets:
- EMR-117: iOS Portrait Mode Nav
- EMR-119: Tab Consolidation Audit
- EMR-122: In-App Translation + Captions
- EMR-124: Tab Reduction (dup of EMR-119)
- EMR-128: Universal Feedback Icon with Annotation
- EMR-133: Patient Medication Explainer (3rd grade + cartoons)
- EMR-134: Emotional Vitals Emoji Scale in APSO Notes
- EMR-138: Mindfulness Emojis for Lifestyle
- EMR-150: Cannabis Combo Wheel on Patient Tab + Landing Page
- EMR-157: Fix Claude Processing GIF Scroll Glitch
- EMR-201: Cannabis Combo Wheel — colors POP + larger wheel & letters

Focus strictly on frontend layouts, styles, and components in src/components/ and src/app/portal/. Ensure all TS checks and lints pass. Commit and create a PR to main." > .agents/logs/sprint_track_1.log 2>&1 &

# Track 2: Clinical Workflows & Charting (10 tickets)
echo "Dispatching Track 2 (Clinical Workflows & Charting)..."
nohup claude --permission-mode auto --worktree sprint-track-2-clinical-workflows -p "You are assigned to Phase 12 Track 2: Clinical Workflows & Charting. Complete the following tickets:
- EMR-129: Provider Breathing Break Popup (30-min timer)
- EMR-131: AI Clinic Notes with Guardrails + Snapshot + APSO
- EMR-132: Charting Timer (selling point vs other EMRs)
- EMR-135: Voice Dictation (better than Dragon)
- EMR-141: Patient Imaging Tab (Read-Only Annotations)
- EMR-155: Hover-Over Lab/Result Explanations (Canopy/Enterprise)
- EMR-158: Collapsible/Expandable Patient Outcomes Check-Ins
- EMR-159: Remove or Merge 'Care Plan' Patient Tab
- EMR-162: Rework My Story → Focus on Storybook
- EMR-163: Create 'My Results' Patient Tab

Work within src/app/(clinician)/ and src/components/clinical/. Do not modify the database or billing layers. Ensure all TS checks and lints pass. Commit and create a PR to main." > .agents/logs/sprint_track_2.log 2>&1 &

# Track 3: AI Scheduling Engine & Automation (15 tickets)
echo "Dispatching Track 3 (AI Scheduling Engine)..."
nohup claude --permission-mode auto --worktree sprint-track-3-scheduling-engine -p "You are assigned to Phase 12 Track 3: AI Scheduling Engine & Automation. Complete the following tickets:
- EMR-012: Scheduling Module + SMS
- EMR-120: Medicare RPM Integration
- EMR-121: Master Access Log + Click Analytics
- EMR-103: Practice Analytics Deep Dive
- EMR-104: Click Counter / Workflow Efficiency
- EMR-206: Self-Serve Online Scheduling
- EMR-207: No-Show Prediction Model + De-Risking
- EMR-208: Algorithmic Follow-Up Cadence per Condition
- EMR-209: Smart Slot Recommender
- EMR-210: Intelligent Waitlist + Cancellation Fill
- EMR-211: Multi-Channel Reminder Orchestration
- EMR-212: New-Patient Intake-to-Visit Gate Pipeline
- EMR-213: Group Visit + Block + Recurring Scheduling
- EMR-214: Provider Preference Engine + Burnout Guardrails
- EMR-215: Scheduling Analytics Cockpit

Implement schemas, algorithms, and interfaces in src/lib/scheduling/ and src/app/(operator)/ops/schedule/. Ensure all TS checks and lints pass. Commit and create a PR to main." > .agents/logs/sprint_track_3.log 2>&1 &

# Track 4: EDI Claims & Reimbursement (15 tickets)
echo "Dispatching Track 4 (EDI Claims & Reimbursement)..."
nohup claude --permission-mode auto --worktree sprint-track-4-edi-claims -p "You are assigned to Phase 12 Track 4: EDI Claims & Reimbursement. Complete the following tickets:
- EMR-045: Insurance Billing AI Agents
- EMR-101: Full CPT/ICD-10 Code Book + Superbills
- EMR-102: Novel Cannabis ICD-10 Code Proposal
- EMR-107: Expected Reimbursement Rate
- EMR-108: Full Revenue Cycle System
- EMR-116: International Multi-Country Billing
- EMR-145: Cannabis Dispensary Billing + CMS $500 Reimbursement
- EMR-216: Real EDI 837P generator (ANSI X12 v5010)
- EMR-217: Availity/Waystar/Change Healthcare gateway client
- EMR-218: Payer rules → DB model + admin editor
- EMR-219: Secondary claim filing (Loop 2320 CAS)
- EMR-220: Provider + Organization NPI + Tax ID schema
- EMR-222: Full NCCI / MUE reference table (CMS quarterly)
- EMR-223: Per-payer contract allowable tables
- EMR-229: Prior-auth workflow + payer portal adapters

Implement these features inside src/lib/billing/ and src/app/(operator)/ops/billing/. Ensure all TS checks and lints pass. Commit and create a PR to main." > .agents/logs/sprint_track_4.log 2>&1 &

# Track 5: Financial Operations & Lockbox (15 tickets)
echo "Dispatching Track 5 (Financial Operations & Lockbox)..."
nohup claude --permission-mode auto --worktree sprint-track-5-financial-ops -p "You are assigned to Phase 12 Track 5: Financial Operations & Lockbox. Complete the following tickets:
- EMR-068: Patient Billing Portal
- EMR-076: AI Prior Authorization
- EMR-105: Philanthropy / Donations Module
- EMR-106: Hospital System Integration
- EMR-114: Credit Card + ACH Storage
- EMR-115: EOB Into Portals
- EMR-127: Leafjourney Charitable Fund + Transparent Ledger
- EMR-172: Patient Mail/Fax OCR Scan + Insurance Cross-Check
- EMR-221: ERA / 835 raw-file ingestion pipeline
- EMR-224: Lockbox / bank deposit matching
- EMR-225: Patient statement auto-generator + e-delivery
- EMR-226: Payment plan engine + card-on-file autopay
- EMR-227: NSF / chargeback handler
- EMR-228: Appeal tracker + outcome learning loop
- EMR-230: RCM daily-close report + exception dashboard

Implement ERA parser, lockbox matcher, and operations dashboard under src/lib/billing/ and src/app/(operator)/ops/revenue/. Ensure all TS checks and lints pass. Commit and create a PR to main." > .agents/logs/sprint_track_5.log 2>&1 &

# Track 6: Gamification, Loyalty & Rebrand (10 tickets)
echo "Dispatching Track 6 (Gamification & Loyalty)..."
nohup claude --permission-mode auto --worktree sprint-track-6-gamification-loyalty -p "You are assigned to Phase 12 Track 6: Gamification, Loyalty & Rebrand. Complete the following tickets:
- EMR-061: Motivational Quotes
- EMR-072: Lifestyle Checkboxes → Plant Growth
- EMR-125: Volunteer & Donation Module (Constitutional Art. VII)
- EMR-126: Provider CME Credits via Research
- EMR-151: Symptom/Diagnosis Supplement Combo Wheel
- EMR-152: Heart-Centric EMR Consciousness (Art. IV)
- EMR-161: Merge Achievements + Lifestyle + Wearable Integration
- EMR-176: Make EMR Fun and Engaging for ALL Users
- EMR-313: Loyalty/points system + gift cards
- EMR-314: Rebrand to 'Seed Trove' / nurture-harvest-fruit lexicon

Work in src/components/gamification/ and src/app/portal/. Ensure all TS checks and lints pass. Commit and create a PR to main." > .agents/logs/sprint_track_6.log 2>&1 &

# Track 7: Leafmart Marketplace & Growth (12 tickets)
echo "Dispatching Track 7 (Leafmart Marketplace & Growth)..."
nohup claude --permission-mode auto --worktree sprint-track-7-marketplace-growth -p "You are assigned to Phase 12 Track 7: Leafmart Marketplace & Growth. Complete the following tickets:
- EMR-007: AI-Powered Supply Store
- EMR-153: Marketing + Business Plan + Target Groups
- EMR-156: Subscription Pricing vs EPIC/Cerner/Practice Fusion
- EMR-170: C-Suite About Page Skeleton
- EMR-188: Integrated Marketplace/Store — Amazon-style ecosystem inside EMR
- EMR-302: Distributor model
- EMR-303: Rival Amazon benchmark
- EMR-305: Product Q&A tab
- EMR-306: Reviews with photos
- EMR-307: AI-curated Product Details
- EMR-310: Checkout Compare sim
- EMR-315: Vendor tax docs + analytics dashboards

Work in src/app/shop/, src/app/vendor/, and src/components/store/. Ensure all TS checks and lints pass. Commit and create a PR to main." > .agents/logs/sprint_track_7.log 2>&1 &

# Track 8: Education & Clinical Integrations (13 tickets)
echo "Dispatching Track 8 (Education & Clinical Integrations)..."
nohup claude --permission-mode auto --worktree sprint-track-8-education-integrations -p "You are assigned to Phase 12 Track 8: Clinical Education & Integrations. Complete the following tickets:
- EMR-002: Dispensary Integration & SKU Scanning
- EMR-003: Milligram-Based Dosing Display
- EMR-013: Conventional EMR Integration
- EMR-017: Dispensary Locator (Google Maps)
- EMR-018: Leafly Strain Database Integration
- EMR-071: AI Chatbot + DoxGPT
- EMR-080: Cannabis Education Library
- EMR-111: Cannabis Education Database
- EMR-173: 15-Day Cannabis EMR Launch Readiness
- EMR-179: Research Articles Hyperlinked + Open in New Tab
- EMR-202: Education page — Justin Kander research PDF under Research tab
- EMR-203: LeafJourney Trifold Reference Guide (cannabinoids + terpenes + bioavailability)
- EMR-204: Landing page — fix 'POTENCY 710' label + remove unconfirmed partner brands

Work in src/lib/integrations/ and src/app/education/. Ensure all TS checks and lints pass. Commit and create a PR to main." > .agents/logs/sprint_track_8.log 2>&1 &

echo "===================================================================="
echo "✅ All 8 parallel tracks have been successfully dispatched!"
echo "You can monitor logs at:"
echo "  tail -f .agents/logs/sprint_track_1.log"
echo "  tail -f .agents/logs/sprint_track_2.log"
echo "  tail -f .agents/logs/sprint_track_3.log"
echo "  tail -f .agents/logs/sprint_track_4.log"
echo "  tail -f .agents/logs/sprint_track_5.log"
echo "  tail -f .agents/logs/sprint_track_6.log"
echo "  tail -f .agents/logs/sprint_track_7.log"
echo "  tail -f .agents/logs/sprint_track_8.log"
echo "===================================================================="
