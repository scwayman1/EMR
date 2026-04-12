# EMR Platform — Ticket Backlog

> Source: Dr. Neal Patel's product prompts + Justin Kander's clinical feedback
> Priority: 1=Urgent, 2=High, 3=Normal, 4=Low
> Status: backlog | ready | in_progress | done

---

## Epic: Cannabis Pharmacology & Prescribing

### EMR-001: Cannabis Combo Wheel
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create an interactive cannabis combo wheel where clinicians can combine different cannabinoids (THC, CBD, CBN, CBG, THCA, CBDA), terpenes (myrcene, limonene, linalool, pinene, caryophyllene, humulene), and flavonoids — then see the resulting therapeutic profile, target symptoms, risks, benefits, and evidence strength.

The wheel should be visual and interactive — not a table. Think of a circular composition tool where you add cannabinoids to the center and the outer rings show symptom matches, delivery recommendations, and dosing ranges from the research corpus.

**Acceptance criteria:**
- Interactive UI component (client-side)
- Cannabinoid + terpene + flavonoid selection
- Shows target symptoms, evidence strength, risks/benefits
- Pulls data from `data/cannabis-research-corpus.json`
- Available in clinician workspace (research section or chart sidebar)

---

### EMR-002: Dispensary Integration & Product SKU Scanning
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create a prescription module that ties into dispensaries where they scan every SKU of every product. The EMR recommends the right products based on SKU availability within a 30-mile radius. Create an internal purchasing store where patients can buy products directly from the EMR, which then documents and creates a paper trail.

**Phases:**
1. Dispensary product catalog API (ingest SKU data)
2. Geolocation-based dispensary lookup (30-mile radius)
3. Product recommendation engine (match patient regimen to available SKUs)
4. In-app purchasing flow (patient buys from EMR → dispensary fulfills)
5. Paper trail / audit log for all purchases

**Acceptance criteria:**
- Dispensary can register and sync product catalog
- Patient sees available products near them matching their Rx
- Purchase creates a documented trail in the patient record
- Clinician can see what the patient purchased

---

### EMR-003: Milligram-Based Dosing Display (Justin Kander)
**Priority:** 2 — High
**Source:** Justin Kander
**Description:**
When analyzing data, the most important insight is mg of cannabinoids, not volumes. Patient instructions should show both volumes AND mg. If the product changes but the mg dose stays the same, the patient should see that clearly.

Track: product types, concentrations, volumes, and doses. For inhalation, track puffs + product concentration and estimate mg via algorithm.

**Status:** Partially done — DosingRegimen model has calculatedThcMgPerDose/Day. Need to enhance the patient-facing display and add inhalation estimation.

**Remaining work:**
- Patient medications page: show "0.5 mL = 2.5 mg THC + 2.5 mg CBD" more prominently
- Inhalation dose estimator: puffs × estimated mg/puff from product concentration
- When product changes, show "Your mg dose stays the same, only the volume changed"

---

### EMR-004: Dosing Recommendation Engine
**Priority:** 3 — Normal
**Source:** Justin Kander + Dr. Patel
**Description:**
Deploy a seamless recommendation engine for products, cannabinoid ratios, doses, and dominant terpenes. Use Justin's research corpus as the evidence base. Separate PRO-dosing insights from research-insights since the data sources are different.

**Architecture:**
- New AI agent: `dosingRecommendation` — takes patient symptoms + outcomes and queries the research corpus
- Returns: recommended cannabinoid ratios, dose ranges, delivery methods, terpene profiles
- Shows evidence tier: "Based on RCT" vs "Based on PRO" vs "Based on clinical experience"
- Surfaces in the clinician chart during prescribing and in the scribe note

---

## Epic: Billing & Coding

### EMR-005: AI-Powered Billing & CPT/ICD-10 Coding
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create a billing structure where AI generates the clinical note, extrapolates all pertinent data to code at the highest CPT code, and links with proper ICD-10 codes. Have AI understand current ICD-10 coding guidelines for all cannabis applications.

**Status:** Partially done — Coding Readiness Agent v2 generates ICD-10 + E&M suggestions. Need to expand to full CPT coding and billing workflow.

**Remaining work:**
- CPT code suggestion (not just E&M level but specific procedure codes)
- Cannabis-specific ICD-10 guidance (F12.x series, Z71.89 counseling, etc.)
- Billing worksheet generation (CPT + ICD-10 linked, ready for submission)
- Superbill / CMS-1500 scaffold
- Revenue tracking dashboard in ops

---

## Epic: Lifestyle Care Plan

### EMR-006: LIFESTYLE Module — Cornerstone of EMR
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
Create a LIFESTYLE-based care plan that revolves around:
- **Sleep**: sleep hygiene, simple tricks to improve sleep
- **Food**: meal plan based on medical history (diabetes, heart disease, dementia)
- **Exercise**: regimen tailored to condition and ability
- **Stress reduction**: techniques, mindfulness, breathing exercises
- **Family dynamics**: social support considerations
- **Habit formation**: behavioral change framework
- **Social connectivity**: community, support groups

Make LIFESTYLE the CORNERSTONE of the EMR. Make it fun — with pictures, colors, and interaction with the patient. Cater to patient's socioeconomic status, gender, and precautions.

**Acceptance criteria:**
- New route: `/portal/lifestyle` for patients, `/clinic/patients/[id]` tab for clinicians
- AI-generated personalized plans based on patient data
- Visual, colorful, interactive — NOT a clinical printout
- Covers all 7 domains (sleep, food, exercise, stress, family, habits, social)
- Printable / shareable (like My Story)

---

## Epic: Supply Store & DME

### EMR-007: AI-Powered Supply Store
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Create a supply store and chain where AI can summarize patient data and recommend durable medical equipment, products, and OTC medications for standard issues like cough, cold, insomnia, pain.

**Features:**
- Product catalog (DME, OTC, supplements, wellness products)
- AI recommendation agent based on patient conditions + outcomes
- In-app ordering with delivery tracking
- Integration with patient's care plan and medication list
- Revenue model for the practice

---

## Epic: Patient Experience & Education

### EMR-008: Educational Library
**Priority:** 2 — High
**Source:** Justin Kander
**Description:**
Educational libraries for patients and physicians covering:
- What the endocannabinoid system is
- Understanding dosing (mg, volumes, ratios)
- Benefits of different cannabinoids
- Potential adverse effects
- How to optimize therapy (minimum effective THC dose)

**Routes:** `/portal/learn` (patient), `/clinic/library` (clinician)

---

### EMR-009: 3rd-Grade Reading Level Patient Explainer
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Explain a patient's medical history and diagnoses at a 3rd-grade reading level for easier comprehension. AI agent that takes clinical data and rewrites it in plain, warm, simple language.

**Implementation:** New narrative function in `narrative.ts` or a dedicated "plain language" agent that rewrites chart summaries, note blocks, and care plans at a simplified reading level.

---

### EMR-010: Visual Health Roadmap
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create a visual roadmap of the patient's past history, current history, and future trajectory. Allow multiple pathway options showing risks, benefits, and effects of each choice.

Example: Patient is overweight, no exercise →
- **Path 1** (status quo): trajectory shows declining quality of life
- **Path 2** (add exercise): trajectory shows better weight and improvement in 6 months

**Implementation:** Interactive visualization (could use SVG or a charting library). AI generates the pathway projections based on patient data + clinical evidence.

---

### EMR-011: Personal Vitals & History (Warmer Wording)
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:**
Vitals, allergies, past medical history, past surgical history — change wording to be more personal. Instead of "PMH: HTN, DM2, CAD" → "Your health story includes high blood pressure, type 2 diabetes, and heart disease."

**Implementation:** Update the chart summary, My Story, and care plan pages to use warm, personal language. Extend the narrative.ts module.

---

## Epic: Scheduling & Communications

### EMR-012: Scheduling Module with SMS Reminders
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create a scheduling module for follow-up appointments that notifies patients via automated text 7 days, 2 days, and 1 day before scheduled appointment time. Allow patient to cancel and reschedule directly from the EMR app.

**Components:**
- Appointment booking UI (patient + operator)
- SMS integration (Twilio or similar)
- Automated reminder workflow (7d, 2d, 1d)
- Cancel/reschedule from the patient portal
- Calendar view for clinician and operator

**Status:** Partially done — Appointment model exists, scheduling agent creates reminders as Tasks. Need real SMS integration and self-service cancel/reschedule.

---

## Epic: EMR Integration & Interoperability

### EMR-013: Conventional EMR Integration
**Priority:** 3 — Normal
**Source:** Justin Kander
**Description:**
Consider integration with other EMRs or replacing them entirely. Most doctors use another EMR for conventional procedures and pharmaceutical management. If this EMR can track conventional treatments as well, it greatly expands the user base.

**Architecture:**
- HL7 FHIR adapter for bidirectional data exchange
- Medication reconciliation (cannabis + conventional)
- Problem list sync
- Encounter/note import
- CCD/CDA document support

---

## Epic: Infrastructure & Platform

### EMR-014: DICOM Viewer & PACS Integration
**Priority:** 4 — Low
**Source:** Product vision
**Description:**
Implement DICOM image viewing so physicians don't need a separate PACS system. Images viewable directly in the patient chart.

**Status:** Images tab exists with DICOM-ready placeholder. Need actual DICOM parsing + viewer component.

---

### EMR-015: Justin's UI Feedback
**Priority:** 3 — Normal
**Source:** Justin Kander
**Status:** Partially done
**Remaining:**
- [x] Remove duplicate "Log a check-in" on Outcomes page
- [x] Better hover effects on primary buttons
- [ ] More pronounced hover effects across all interactive elements
- [ ] General UX polish pass based on Justin's testing

---

---

## Epic: Prescribing Module v2

### EMR-016: Full Prescription Form with Dropdowns + Manual Input
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
Prescription module with all dropdown menus AND manual data input:
- NAME of medication (searchable dropdown + free text)
- Dose (mg, mL, etc.)
- Sig = amount to take and how many times daily
- Days supply
- Quantity
- Type (tablet, tincture, edible, gummy, flower, grams, mL)
- Refills (number)
- Drug interaction warning popup (YELLOW or RED) that MUST be acknowledged and signed off before final submission
- Two note boxes: "Note to patient" + "Note to pharmacy (internal)"
- Diagnosis linking button: link cannabis medication to ICD-10 diagnosis (GAD F41.1, MDD F32.9, HTN I10, HLD E78.00, Insomnia G47.00, etc.)
- On final Rx send: automated text message to patient with exact name/brand, dosing, amount prescribed, and PICKUP LOCATION (store name, address, phone, hours)

---

### EMR-017: Dispensary Locator with Google Maps
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create a Google Maps inlay that locates:
- All local dispensaries
- All local cannabis healthcare providers
Embedded map component with pins, info cards, and directions.

---

### EMR-018: Leafly Strain Database Integration
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Map most common medical issues that cannabis is used for (sleep, anxiety, insomnia, stress, pain, cancer) and map to ALL strains of flower from the Leafly database. Include terpene profiles and cannabinoid profiles for each strain. Create a searchable strain finder that matches patient symptoms to optimal strains.

---

## Epic: Patient Demographics & Identity

### EMR-019: Full Demographics Tab
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Demographics tab including:
- DOB, age (auto-calculated), SSN (encrypted), sex, race/ethnicity, marital status
- Home address, email, phone number
- Alert box (allergies, critical info)
- Picture box for identity photo
- 1 unique thing about them (personal touch)
- "Medical Life Number" (NOT medical record number — find the right term for a lifelong identifier)
- Insurance information with backend eligibility checking to determine coverage for products

---

## Epic: Clinical Notes & Documentation

### EMR-020: APSO Note Format with Wearable Integration
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create a SOAP note but in the order of: Assessment, Plan, Subjective, Objective (APSO).
- Allow vital input from wearable technology: Apple Watch, Whoop, Oura Ring
- Create correlations and extrapolate trends based on cannabis intake and vitals
- "They are not a patient. This is human care."
- "They are not the system, they are a story, and every story deserves to be heard."

---

### EMR-021: AI-Recommended Initial Treatment Plan
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create an AI-prompted and recommended initial care plan that physicians can use as a starting point, modify, and then sign off on before giving to patient. The AI uses research corpus + patient data + outcomes to generate evidence-based recommendations. Physician has final authority.

---

## Epic: Gamification & Patient Engagement

### EMR-022: Cannabis Plant Health Companion
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create a virtual cannabis plant that GROWS or DIES based on how well the patient takes care of their health:
- Exercise done 2x/week = new leaves
- Exercise done 1 month in a row = new stems
- Lost 5 lbs in one month = new flowers
- Water intake = leaves turn yellow (dehydrated) or green (hydrated)
- Doctor visit completed = new fertilizer
- Preventive care done (colonoscopy, mammogram, bone density) = more stems, leaves
- Eat poorly, poor sleep, poor water, stress = plant starts dying

This is the gamification of health. Visual, interactive, emotional.

---

### EMR-023: Gamify Health (Apple Rings Style)
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Gamify health metrics like Apple's activity rings:
- Exercise workouts completed
- Water intake
- Weight trends
- Vitals comparison (BP, HR, weight, MOOD over time)
- Streaks, achievements, milestones
- Cannabis-specific tracking rings (doses taken, outcomes logged)

---

### EMR-024: Positive Input Requirement
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
For every "problem" a patient inputs (poor sleep, pain, stress, digestive issues), prompt that they MUST input one POSITIVE thing about their life/health — family, finance, weather, gratitude, etc.
"They don't have problems, this is a process."
Patients should focus on both challenges AND positives.

---

## Epic: Design & Branding

### EMR-025: Cannabis-Themed Design Palette
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Design updates:
- Cannabis plants in light shade in background
- Main colors: green, white, purple (similar to cannabis plants)
- Accents of orange
- Try different palettes
- Cannabis-specific visual language throughout

---

### EMR-026: Cannabis Emojis
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:**
Create custom cannabis emojis for use in messaging, notes, and the UI:
stems, leaves, plant, fire, tincture drop, pain icon, sleep icon, anxiety icon, depression icon, cancer ribbon

---

### EMR-027: Platform Disclaimer
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:**
Create a disclaimer at the bottom of the platform:
"Cannabis should be considered a medicine so please use it carefully and judiciously. Do not abuse Cannabis and please respect the plant and its healing properties."

---

## Epic: Platform & Infrastructure

### EMR-028: Split Window / Multi-Tab View
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create split window ability WITHIN the EMR so up to 3 MAX tabs can be open at the same time. Makes it easier to maneuver instead of clicking back and forth. Think Bloomberg Terminal or VS Code split panes — but for clinical workflows.

---

### EMR-029: ADA Compliance
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Maintain American Disability Act (ADA) friendly website:
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation for all workflows
- High contrast mode
- Focus indicators
- Alt text on all images
- Semantic HTML throughout

---

### EMR-030: Multi-Language Support
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Create language conversions for:
English, Spanish, Vietnamese, Gujarati, Hindi, and more.
i18n framework with per-page translations. AI-assisted translation for dynamic content (notes, messages, care plans).

---

### EMR-031: Responsive Cross-Device Experience
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
"We want the EMR seamless from desktop, phone to iPad."
Full responsive audit and optimization across all breakpoints. Touch-friendly interactions on mobile. Consider PWA or native app wrapper.

---

### EMR-032: Patient Lab/Document Email & Print
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Allow patients to EMAIL labs, notes, chart documents AND print right from the portal in OCR PDF format. Clean, professional document formatting.

---

## Epic: Communications

### EMR-033: Physician-to-Physician Secure Portal
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create two communication portals:
1. Patient ↔ Physician portal (already exists — enhance it)
2. SECURE PRIVATE Physician ↔ Physician portal for internal communication BETWEEN providers about patient care. HIPAA-compliant, separate from patient-facing messages.

---

### EMR-034: Phone & Video Capability in Messaging
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Create phone and video capability + icons within the messaging/inbox tab. Click-to-call, video visit launch, call logging.

---

## Epic: Data & Analytics

### EMR-035: Backend Data Extrapolation Dashboard
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Backend data extrapolation with BOTH identifying and de-identifying information. Allow backend user to click on all applicable fields (DOB, name, age, sex, etc.) to build custom reports and research datasets. Support for de-identified exports for research purposes.

---

## Epic: Educational Resources

### EMR-036: Justin Kander's Book & Free Resources
**Priority:** 4 — Low
**Source:** Justin Kander
**Description:**
Add Justin's book (FreeCannabisCancerBook.com) to the educational library as a free resource. It's the largest integration of human cases and research demonstrating how cannabis fights cancer. Good resource for patients and providers, even though dosing isn't well-characterized in all cases.

---

## Summary

| # | Title | Priority | Epic | Status |
|---|---|---|---|---|
| 001 | Cannabis Combo Wheel | High | Pharmacology | **done** |
| 002 | Dispensary Integration & SKU Scanning | High | Pharmacology | backlog |
| 003 | Milligram-Based Dosing Display | High | Pharmacology | partial |
| 004 | Dosing Recommendation Engine | Normal | Pharmacology | **done** |
| 005 | AI-Powered Billing & CPT/ICD-10 | High | Billing | **done** |
| 006 | LIFESTYLE Module | Urgent | Lifestyle | **done** |
| 007 | AI-Powered Supply Store | Normal | Supply Store | backlog |
| 008 | Educational Library | High | Education | **done** |
| 009 | 3rd-Grade Reading Level Explainer | Normal | Education | **done** |
| 010 | Visual Health Roadmap | High | Education | **done** |
| 011 | Personal Vitals Wording | Low | Education | **done** |
| 012 | Scheduling Module + SMS | High | Scheduling | partial |
| 013 | Conventional EMR Integration | Normal | Integration | backlog |
| 014 | DICOM Viewer & PACS | Low | Infrastructure | stub |
| 015 | Justin's UI Feedback | Normal | UI Polish | partial |
| 016 | Full Prescription Form (Rx v2) | Urgent | Prescribing | **done** |
| 017 | Dispensary Locator (Google Maps) | High | Prescribing | backlog |
| 018 | Leafly Strain Database Integration | Normal | Pharmacology | backlog |
| 019 | Full Demographics Tab | High | Demographics | **done** |
| 020 | APSO Note + Wearable Integration | High | Documentation | **done** |
| 021 | AI-Recommended Initial Plan | High | Documentation | **done** |
| 022 | Cannabis Plant Health Companion | High | Gamification | **done** |
| 023 | Gamify Health (Apple Rings) | Normal | Gamification | **done** |
| 024 | Positive Input Requirement | Normal | Gamification | **done** |
| 025 | Cannabis Design Palette | High | Design | **done** |
| 026 | Cannabis Emojis | Low | Design | **done** |
| 027 | Platform Disclaimer | Low | Design | **done** |
| 028 | Split Window / Multi-Tab | High | Platform | backlog |
| 029 | ADA Compliance | High | Platform | **done** |
| 030 | Multi-Language Support | Normal | Platform | **done** |
| 031 | Responsive Cross-Device | High | Platform | backlog |
| 032 | Patient Email/Print Documents | Normal | Platform | **done** |
| 033 | Physician-to-Physician Portal | High | Communications | **done** |
| 034 | Phone & Video in Messaging | Normal | Communications | **done** |
| 035 | Backend Data Dashboard | Normal | Analytics | **done** |
| 036 | Justin's Book in Library | Low | Education | **done** |

---

## Wave 8+ — Dr. Patel's Late Night Vision Drop (April 10)

### EMR-037: End-to-End Communications Overlay
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
- E2E encrypted text messaging with transcription
- HIPAA-compliant video calls
- Fax capabilities (send + receive)
- HIPAA-compliant phone calls
- AI transcription for phone calls — capture only pertinent medical info, DISCARD personal data
- Full communication suite within the EMR

---

### EMR-038: Cannabis & Cancer Book Integration
**Priority:** 3 — Normal
**Source:** Dr. Patel / Justin Kander
**Description:**
Integrate Justin's book (Cannabis and Cancer) into the backend as a reference guide and data source. Parse and index for the Research Agent and educational library. Source: Dropbox link provided.

---

### EMR-039: Product Store with Affiliate Links
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create "Store" button on top right. Include affiliate links for product selections:
- phytorx.co
- flowerpoweredproductsllc.com
- aulv.org
Disclaimer popup on link open: "Please consult your healthcare provider before considering these products..."
Full Amazon-style store framework for cannabis products. Joint decision language.

---

### EMR-040: Cannabis Plant 101 — Front Page Feature
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Create a 101-word paragraph on the front page about the beauty, power, healing properties, and sacredness of the cannabis plant. Include that all who use the website shall respect the plant and use it with intention. Highlighted section with beautiful background and typography.

---

### EMR-041: Ambient Classical Music on Front Page
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:**
Front page plays beautiful, relaxing classical music (no words) at low volume with a small mute icon. Subtle, non-intrusive. Consider autoplay policies.

---

### EMR-042: MIPS Data Extrapolation
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
AI functionality to extrapolate data from chart notes and messages to obtain MIPS (Merit-based Incentive Payment System) data. Meet all CMS data requirements. Upload entire MIPS requirements and CMS rules around cannabis as Schedule 3.

---

### EMR-043: Animated Plant Companion (Enhanced)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
The health plant needs MOTION — live cartoon feel:
- Positive actions: container pops up and pours water on plant, sun shines
- Negative: weather gets cloudy, water dries up, plant starts to wilt
- Full animation, not static SVG
- Consider Lottie or CSS animations or Canvas

---

### EMR-044: Modular Licensable EMR Framework
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
Make the entire EMR built on a fully licensable, modular framework:
- Clients can buy individual modules
- API-friendly for integration with Cerner, Epic, Practice Fusion
- Reproducible for selling and scaling
- Maintains integrity while being customizable
- Full white-label capability

---

### EMR-045: Insurance Billing AI Agent System
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Build intricate backend insurance/coding/charting system with SEPARATE AI agents that communicate with each other to ensure highest possible billing amount correlating to proper documentation and coding. Maximize reimbursement rates from each major US insurance company.

---

### EMR-046: Insurance Eligibility Checker
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Built-in eligibility software to determine if patient's insurance or conditions qualify them for insurance-reimbursed cannabis products or a state medical cannabis card. Document and note in chart if eligible.

---

### EMR-047: Medicare CBD Reimbursement Framework
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Create entire framework for the upcoming CMS program allowing Medicare recipients to purchase up to $500 of CBD with proper reimbursement. Track eligibility, purchases, and reimbursement status.

---

### EMR-048: About Page — Founders & Mission
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create "About" section showing:
- Scott Wayman — AI genius, successful entrepreneur, EMR savant (pull bio from LinkedIn)
- Dr. Neal H Patel — shaman, innovator, visionary, philanthropist, cannabis expert (pull from LinkedIn + PhantomMed.com)
- Include photos
- Mission statement: "As doctors and patients, we are done with the current EMR models. It's outdated, archaic, not user friendly, and intimidating. We aim to create a revolutionary new EMR from scratch... This isn't MyChart. This is MyStory. This isn't a patient's medical history. This is a patient's medical journey. This isn't a patient's problem, it's a patient's process. We will not disrupt healthcare. We will destroy it and rebuild it the right way."

---

### EMR-049: Pricing & Subscription Tiers Page
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Create links or side website that breaks down EMR pricing and tiers of subscription options based on client needs. Modular pricing aligned with EMR-044's module structure.

---

### EMR-050: EMR Slogan
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:**
Create a slogan for the EMR, max 10 words. Ideas to incorporate: "Personalized cannabis care at your fingertips from an EMR and providers who have heart and soul."

---

### EMR-051: Native Mobile App (iOS, iPad, Android)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create the entire EMR as a NATIVE app for iOS, iPad, and Android with proper dimensions, stretching, and seamless cross-device experience. Consider React Native, Expo, or Capacitor wrapper.

---

### EMR-052: Clinical Trial Matching
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Connect patient chart data to the largest national clinical trial databases (ClinicalTrials.gov). AI determines if patient is eligible for trials based on their data. Send recommendation directly to patient's portal, email, or text — AI-summarized trial info including website, trial type, and what it consists of.

---

### EMR-053: ProHub Integration
**Priority:** 2 — High
**Source:** Meeting notes (Ryan Castle, Jim Gerencser)
**Description:**
Merge the ProHub's robust backend of dynamic, validated surveys and longitudinal tracking with the EMR's frontend. ProHub was built to be modular and API-friendly. Goal: centralized one-stop shop tying ProHub + Cancer Playbook + EMR into a full ecosystem.

---

### EMR-054: Veterinary & Psilocybin Expansion
**Priority:** 4 — Low
**Source:** Meeting notes
**Description:**
System architecture should support replication for:
- Veterinary cannabis care
- Psilocybin-based therapy platforms
- Other conditions (breast cancer specific, etc.)
White-label + modular architecture from EMR-044 enables this.

---

### EMR-055: Data Ownership & Security Framework
**Priority:** 2 — High
**Source:** Ryan Castle
**Description:**
Ensure proper data ownership — not just access via AWS/GCP but actual proprietary ownership. Document data ownership agreements, implement data sovereignty controls, and ensure the platform's uniqueness is protected even when hosted on cloud infrastructure.

---

## Updated Summary

| # | Title | Priority | Status |
|---|---|---|---|
| 001-036 | Original backlog | Various | 33 done, 3 remaining |
| 037 | Communications Overlay | High | backlog |
| 038 | Cannabis Book Integration | Normal | backlog |
| 039 | Product Store + Affiliates | High | **done** |
| 040 | Cannabis Plant 101 Paragraph | Normal | **done** |
| 041 | Ambient Music | Low | **done** |
| 042 | MIPS Data Extrapolation | High | backlog |
| 043 | Animated Plant Companion | High | **done** |
| 044 | Modular Licensable Framework | Urgent | backlog |
| 045 | Insurance Billing AI Agents | High | backlog |
| 046 | Insurance Eligibility Checker | High | **done** |
| 047 | Medicare CBD Framework | Normal | **done** |
| 048 | About Page — Founders | High | **done** |
| 049 | Pricing & Tiers | Normal | **done** |
| 050 | EMR Slogan | Low | **done** |
| 051 | Native Mobile App | High | backlog |
| 052 | Clinical Trial Matching | High | **done** |
| 053 | ProHub Integration | High | backlog |
| 054 | Vet & Psilocybin Expansion | Low | backlog |
| 055 | Data Ownership Framework | High | **done** |

**Total: 55 tickets across 20+ epics. 44 shipped, 11 remaining.**

---

## Wave 14+ — Dr. Patel's Product Drop #2 (April 11)

### EMR-056: Comprehensive Product + Dosing Recommendation Engine
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Deploy a seamless recommendation engine for products, cannabinoid ratios, doses, and dominant terpenes based on ALL cannabinoid databases from online sources and well-published books. Expand beyond the current research corpus to include book references (e.g., Justin Kander's book, Russo's work, other canonical texts). AI agent cross-references patient data against the full corpus.
**Relates to:** EMR-004 (Dosing Recommendation Engine — foundation done)

---

### EMR-057: Native Mobile App with HDMI/Projector Support
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Create the entire EMR as a NATIVE app that runs on iOS, iPad, and Android with proper dimensions, stretching, and seamlessly in both portrait and landscape mode with proper zooming proportions and proper stretching when connected via a projector or HDMI.
**Expansion of:** EMR-051
**Tech:** React Native or Capacitor wrapper; responsive scaling for external displays

---

### EMR-058: Clinical Trial Auto-Recommendation Delivery
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Create full framework to connect the patient chart and all chart information to the largest national clinical trial databases (ClinicalTrials.gov) to determine eligibility. AI-summarized recommendation delivered directly to patient via portal, email, OR text — including website, trial type, and description.
**Relates to:** EMR-052 (basic matching done; needs delivery pipeline)

---

### EMR-059: Single-Page Prescription Module (No Scrolling)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Prescription module must fit on ONE page, FIXED, without scrolling. All necessary parameters visible at once: product, dose, sig, days supply, quantity, type, refills, interaction warning, note boxes, diagnosis link, patient instructions.
**Status:** Current Rx form scrolls — needs layout redesign with tighter density

---

### EMR-060: Minimum Clicks, Minimum Scrolling UX Pass
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:** Global EMR audit: reduce clicks between tabs, reduce scrolling to find information. Patients and providers should see all critical information in a simple, clean format on a single viewport wherever possible. Information density over whitespace where it matters (clinical screens).

---

### EMR-061: Motivational Quotes System
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:** Motivational quotes pop-up on login. Every page has a rotating quote that refreshes. Draw from keywords covering positive emotions: God, love, faith, emotions, energy, happiness, resilience, persistence, not giving up, etc. A curated library of 100+ quotes with themes.

---

### EMR-062: Ancillary Services EMR Module (OT, PT, Speech, Case Mgmt, Home Health)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Full ancillary EMR module including Occupational Therapy, Physical Therapy, Speech Therapy, Case Management, and Home Health documentation. Sign-off workflow back to primary provider. Seamless communication between all services within the platform.

---

### EMR-063: Pharmacy Communication Module with Dual Sign-Off
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Backend pharmacy communication module — direct access to pharmacists for clarifications or recommendations. Any medication change requires BOTH pharmacist AND provider sign-off before taking effect. Audit trail captures who approved what and when.

---

### EMR-064: Audit Log PDF Export
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:** Full running log of documentation and backend clicks: who accessed each chart, timestamps, what was viewed/modified. Exportable as a PDF for HIPAA auditing purposes. Filter by date range, user, patient.
**Status:** AuditLog model already exists; needs export UI

---

### EMR-065: AI Compliance Auditing Agent
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Full automated AI agent that continuously audits all notes, labs, and communications for compliance with CMS standards. Cross-references with major insurance company auditing requirements (Aetna, BCBS, UHC, Cigna, Humana, Medicare, Medicaid). Flags gaps before submission.

---

### EMR-066: Validated Assessment Library Expansion
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Add ALL peer-reviewed validated surveys under the Assessments tab:
- Pain: BPI, PEG, McGill Pain Questionnaire
- Anxiety: GAD-7 (done), BAI, HAM-A
- Depression: PHQ-9 (done), PHQ-2, Beck Depression Inventory
- Insomnia: ISI, PSQI, Epworth Sleepiness Scale
- Stress: PSS-10, Perceived Stress Scale
- Cancer: FACT-G, EORTC QLQ-C30
- Function: PROMIS-29 (done), Oswestry Disability Index
- Cognition: MoCA, MMSE, SLUMS
- Substance: AUDIT, DAST, Cannabis Use Disorder Identification Test
- And more

---

### EMR-067: Lab Ordering Module (Quest/LabCorp) with Nature-Themed Patient View
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
- Direct lab ordering connected to Quest + LabCorp databases
- Cross-reference patient's ICD codes for highest-use labs
- Full searchable database (every letter searchable)
- Lab sets — save as personal favorites (e.g. "normal follow-up = E78.00, E11.9, Z79.899, I10 → CMP, CBC, Lipid, A1C, GGT")
- CRITICAL values auto-notify provider, require sign-off + documented plan
- Patient lab tab: view raw labs, print, download PDF, email, fax
- Trends visible, colorful, nature-themed: worse labs → worse weather → dying plant; better labs → better weather → thriving plant (integrates with My Garden)
- Cross-reference ordered labs with highest-use ICD codes + insurance coverage

---

### EMR-068: Patient Billing Portal with AI EOB Summaries
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
- Patient access to EOBs, invoices
- AI-summarized explanations in 3rd-grade language: why they got the bill, how much, what it covers, how to dispute
- Pay invoices directly in the system
- File insurance claim disputes through the portal (ties into major insurance + CMS)
- State insurance regulation compliant
- Labs shown in green/yellow/red stoplight format (like drug-drug interactions)
- AI "suggestions and recommendations" for providers based on abnormal labs

---

### EMR-069: AI Fairytale Chart Summary
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Full AI-driven one-page summary of the patient's chart in a beautiful fairytale storybook format. Reads seamlessly like a book. Easy for providers to interpret at a glance AND for patients to understand. Complements the "My Story" ebook with a more narrative, literary voice.

---

### EMR-070: USPSTF Preventive Screening Reminders with Emoji Checklist
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
- Implement full USPSTF A and B grade recommended screening measures
- Each screening gets an emoji (pap smear, colonoscopy, mammogram, DEXA, CT chest screening, etc.)
- Emojis appear on chart if patient is DUE
- Auto pop-up: "Consider discussing screening measures" with pending emoji checklist
- Include the emoji checklist in the AI fairytale summary so patient can bring it to all providers

---

### EMR-071: AI Chatbot + DoxGPT Integration
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:** AI chatbot that integrates patient information with DoxGPT to retrieve properly vetted resources and evidence-based treatments and suggestions. Physician has final say on all recommendations before they reach the patient.

---

### EMR-072: Lifestyle Checkboxes → Plant Growth
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Add checkboxes next to every aspect of the wellness toolkit on the Lifestyle tab. Growth mechanics:
- Every check = another leaf
- One check from each category in a day = new stem
- One check from each category every day for a month = flowers start blooming
Ties directly into My Garden plant companion.

---

### EMR-073: Customizable Patient Portal Layouts
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:** Allow patients to customize their portal:
- Organize/rearrange tabs via drag-and-drop
- Choose color palette (themes)
- Save layout preferences per user

---

### EMR-074: Music Integration (Spotify / Apple Music)
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:** Allow patients to connect their Spotify or Apple Music to play music while reviewing their chart. The AI fairytale summary (EMR-069) can include a soundtrack that patients can post on social media or email.

---

### EMR-075: Social Media Sharing Module
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:** Allow patients to share their results and progress on the Lifestyle tab and My Garden plant tab to social media. Generate beautiful share cards with stats and plant visuals.

---

### EMR-076: AI-Driven Prior Authorization
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Prior authorization framework where all medications that need a PA are initially handled by AI — pulls all data, proper coding, submits to insurance. Only on second denial does provider involvement kick in, with messaging and phone calls happening WITHIN the system.

---

### EMR-077: Full Modular EMAR Framework
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Full modular API framework EMAR (Electronic Medication Administration Record) that includes ALL current prescription medications on the market — doses, standard amounts, available through all large pharmaceutical companies and pharmacy networks.

---

### EMR-078: Specialist Referral Module with AI Packet Generation
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Modular referral framework:
- Patient looks up specialists in their network by location + ratings
- One-click to create appointment request or generate message to office
- AI determines "pertinent" chart data for the referral (notes, labs, consults, images) and auto-attaches
- Seamless handoff to specialist's office

---

### EMR-079: Dementia / Alzheimer's Screening + Mindspan Integration
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
- Connect to Mindspan.co for self-assessment memory tests within the EMR
- Results stored in chart
- AI generates lifestyle plan to reduce dementia risk (exercise, read upside down, go outside)
- For diagnosed patients: practical quality-of-life framework

---

### EMR-080: Cannabis Education Library (Laws + Research + Data)
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:** Full cannabis education library:
- All peer-reviewed journal articles
- All patient data collected on cannabis
- Current legislation, rules, laws at city, county, state, federal levels
- Searchable, filterable

---

### EMR-081: OCR Scan & Auto-Populate
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Scanned documents go through OCR and auto-populate proper chart fields. Example: patient brings a two-page paper with medications, supplements, surgeries, emergency contacts → EMR extracts all data, places it in the right fields, sorts chronologically.

---

### EMR-082: Electronic Medical Record Release Between Doctors
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Electronic record release framework — doctors can request charts from other doctors, patient e-signs, provider e-signs, chart arrives seamlessly through the EMR. Replaces fax-based record requests.

---

### EMR-083: Pediatric Module
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:** Pediatric module with:
- Growth charts (height, weight, head circumference, BMI)
- Vaccine schedule tracking
- Eating habits log
- Milestone tracking
- Happy, cute cartoon theme throughout

---

### EMR-084: Military-Grade Encryption + Legal Licensing Framework
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
- Military-grade encryption (uncopyrightable)
- Legal framework for licensing to Epic, Cerner, outpatient clinics, PT/OT locations, hospitals
- JCAHO, CMS standards + guidelines compliance
- Patent + trademark ALL aspects of the EMR
- Sample licensing contracts

---

### EMR-085: iCal / Google Calendar Export
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:** All scheduled appointments can be exported and added directly to the patient's iCal or Google Calendar via standard ICS file. One-click "Add to calendar" button on the appointment card.

---

## Wave 15+ — Dr. Patel's Product Drop #3 (April 11, later)

### EMR-086: Community Resource Connector
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Modular framework to connect patients to trusted community resources and organizations based on their current medical conditions, within a 50-mile radius.

Example: A patient with Dementia in Orange County gets connected to:
- UCI MIND clinic
- HOAG Neurosciences
- Alzheimer's OC
- Local support groups
- Caregiver respite services

**Implementation:**
- Curated database of resource organizations keyed by condition + geography
- Geo-lookup based on patient address
- AI-generated resource packets: what the organization offers, how to connect, what to expect
- Deliverable to patient via portal, email, or SMS
- Starts with dementia + cancer + chronic pain + mental health; expands by region

---

### EMR-087: Legislative Advocacy Portal
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Patient-facing module to message and email local representatives and congress members advocating for cannabis reform.

**Features:**
- Lookup representatives by patient address (OpenStates or Google Civic API)
- AI-generated advocacy letters tailored to patient's story and condition
- Templates for different asks: reclassification, research funding, insurance coverage, patient access, veteran access
- Send via portal with one click (integrates with email/SMS)
- Track which patients have contacted which reps
- Log as audit trail to show engagement

---

### EMR-088: Cannabis Contraindication Override Warning
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
Pop-up warning during prescribing when patient has a major cannabis contraindication.

**Contraindications to flag:**
- History of schizophrenia or psychotic disorder
- Bipolar disorder (especially type I)
- Severe cardiovascular disease
- Pregnancy / breastfeeding
- Active substance use disorder
- Severe liver dysfunction
- Children / adolescents (for high-THC products)
- History of cannabis hyperemesis syndrome
- Recent MI or unstable angina

**Required action:**
- Provider MUST document override reasoning before proceeding
- Override reason stored in chart + audit log
- Prescription cannot be submitted until override is signed
- Dual sign-off optional for high-risk overrides
- Integrates with existing drug-interaction stoplight system

---

### EMR-089: Cannabis-Infused Recipe Library
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Curated "food as medicine" recipe library on the Lifestyle tab. 5-20 minute recipes for breakfast, lunch, dinner, snacks, and appetizers — each infused with cannabis and aligned to a dietary philosophy.

**Dietary styles to support:**
- Mediterranean diet
- Ayurvedic diet
- Mexican cuisine
- Italian cuisine
- Vegetarian
- Vegan
- Keto / low-carb (optional)

**Each recipe includes:**
- Prep + cook time
- mg of THC/CBD per serving
- Ingredients with optional dispensary pickup
- Step-by-step instructions
- Nutrition info
- Companion education on decarboxylation + infusion basics

---

### EMR-090: ER/Hospital Admission Notification + Inpatient EMR Module
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
**Part 1 — Notification:**
- Text notification sent to the primary care provider when a patient is sent to the ER or admitted to the hospital
- Source: HL7 ADT feed, state health information exchange, or patient self-report
- Includes hospital name, chief complaint if available, admission time
- Creates a task in the provider's inbox

**Part 2 — Inpatient EMR Module:**
- Full modular hospital EMR within the Green Path framework
- Inpatient workflows: admission H&P, progress notes, discharge summary
- Synchronizes between outpatient and inpatient treatment — same patient, same chart, different care setting
- Care transitions automatically documented when patient moves between settings
- Inpatient medications reconciled against outpatient med list on discharge

---

### EMR-091: Medical Cannabis Dispensary Module
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
Full medical-cannabis dispensary integration. **Medicinal use only — recreational is explicitly excluded.**

**Dispensary side:**
- Dispensaries can register and log in
- External link to current product inventory cross-referenced with SKU
- Budtender electronic signature required on every dispense

**Provider side:**
- Provider "prescribes" cannabis directly from the dispensary's live inventory
- Electronic Rx sent to dispensary for approval
- Running log of patient visits to dispensary (medical only)

**Patient side:**
- Must have a valid medical marijuana card to use the module
- Purchased products auto-populate into the patient's medication list
- Product name, SKU, purchase date, quantity documented
- Data forwarded to the state medical cannabis registry

**CURES integration (optional):**
- For patients at high abuse potential or on scheduled meds, run through cures.doj.gov (California CURES) to check PDMP
- Flag conflicting scripts, early refills, multiple prescribers

**What this does NOT do:**
- Recreational cannabis — completely separate, not handled by this module
- Non-card-holding patients — cannot use dispensary flow

---

### EMR-092: Dual Treatment Protocols — Western + Eastern (Holistic) Medicine
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
For EVERY medical diagnosis in the system, provide TWO treatment protocols side-by-side:

**1. Standard pharmaceutical algorithm:**
- Evidence-based first-line, second-line, third-line pharmacotherapy
- Dosing, titration, monitoring parameters
- Guideline source (UpToDate, ACC/AHA, USPSTF, etc.)

**2. Holistic / alternative protocol:**
- Over-the-counter products and supplements
- Lifestyle interventions (diet, exercise, sleep, stress)
- Traditional modalities: acupuncture, massage, yoga, meditation
- Herbal medicine (Ayurvedic, TCM, Western herbalism)
- Mind-body therapies (CBT, breathwork, biofeedback)

**Goal:** Comprehensive all-inclusive treatment plan that blends eastern and western medicine. Physician selects the blend that fits the patient. Patient sees both paths and can discuss preferences with their provider.

**Starts with the most common cannabis care conditions:** chronic pain, anxiety, insomnia, depression, PTSD, migraine, IBS, fibromyalgia, nausea/CINV, cancer, MS, Parkinson's, epilepsy.

---

## Updated Summary (after Wave 15 backlog expansion)

| # | Title | Priority | Status |
|---|---|---|---|
| 086 | Community Resource Connector | High | **done** |
| 087 | Legislative Advocacy Portal | Normal | backlog |
| 088 | Cannabis Contraindication Override | Urgent | **done** |
| 089 | Cannabis-Infused Recipe Library | Normal | backlog |
| 090 | ER Admission Notification + Inpatient EMR | Urgent | backlog |
| 091 | Medical Cannabis Dispensary Module | Urgent | backlog |
| 092 | Dual Treatment Protocols (Western + Eastern) | High | backlog |

**Grand total: 92 tickets. ~50 shipped, 42 remaining.**

---

## Updated Summary (after Wave 14 backlog expansion)

| # | Title | Priority | Status |
|---|---|---|---|
| 001-055 | Previous waves | Various | 44 done, 11 remaining |
| 056 | Comprehensive Recommendation Engine | High | backlog |
| 057 | Native Mobile App + HDMI | High | backlog |
| 058 | Clinical Trial Delivery | High | backlog |
| 059 | Single-Page Rx (No Scrolling) | High | backlog |
| 060 | Min-Clicks UX Pass | Urgent | backlog |
| 061 | Motivational Quotes | Normal | backlog |
| 062 | Ancillary Services Module | High | backlog |
| 063 | Pharmacy Communication | High | backlog |
| 064 | Audit Log PDF Export | Normal | backlog |
| 065 | AI Compliance Auditing Agent | High | backlog |
| 066 | Validated Assessment Library Expansion | High | **done** |
| 067 | Lab Ordering (Quest/LabCorp) | High | backlog |
| 068 | Patient Billing Portal | High | backlog |
| 069 | AI Fairytale Chart Summary | High | **done** |
| 070 | USPSTF Screening Reminders | High | backlog |
| 071 | AI Chatbot + DoxGPT | Normal | backlog |
| 072 | Lifestyle Checkboxes → Plant Growth | High | backlog |
| 073 | Customizable Patient Portals | Normal | backlog |
| 074 | Spotify / Apple Music | Low | backlog |
| 075 | Social Media Sharing | Normal | backlog |
| 076 | AI Prior Authorization | High | backlog |
| 077 | Modular EMAR Framework | High | backlog |
| 078 | Referral Module + AI Packet | High | backlog |
| 079 | Dementia Screening + Mindspan | Normal | backlog |
| 080 | Cannabis Education Library | Normal | backlog |
| 081 | OCR Scan & Auto-Populate | High | backlog |
| 082 | Electronic Record Release | High | backlog |
| 083 | Pediatric Module | High | backlog |
| 084 | Military Encryption + Legal Framework | Urgent | backlog |
| 085 | iCal / Google Calendar Export | Normal | **done** |

**Grand total: 85 tickets. 44 shipped, 41 remaining.**

### Remaining tickets (require external APIs or infrastructure):
- EMR-002: Dispensary Integration (needs dispensary API)
- EMR-013: Conventional EMR Integration (needs HL7 FHIR adapter)
- EMR-017: Dispensary Locator (needs Google Maps API key)
- EMR-018: Leafly Strain Database (needs Leafly API)
- EMR-028: Split Window / Multi-Tab (complex UI architecture)
- EMR-031: Responsive Cross-Device (audit pass)
- EMR-037: Communications Overlay (needs Twilio/WebRTC)
- EMR-038: Cannabis Book Integration (needs content parsing)
- EMR-042: MIPS Data Extrapolation (needs CMS rules engine)
- EMR-044: Modular Licensable Framework (architecture documentation)
- EMR-045: Insurance Billing AI Agents (multi-agent system)
- EMR-051: Native Mobile App (React Native / Capacitor)
- EMR-053: ProHub Integration (needs ProHub API)
- EMR-054: Vet & Psilocybin Expansion (architecture only)

---

## Wave 9+ — Dr. Patel's Second Vision Drop (April 10 — expanded backlog)

### EMR-056: Seamless Recommendation Engine from All Databases
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Deploy a seamless recommendation engine for products, cannabinoid ratios, doses, and dominant terpenes based on ALL cannabinoid databases from online and well-published books. Goes beyond the current 50-study corpus to ingest:
- Leafly strain database
- Open-source cannabis pharmacology papers
- Published cannabis medicine textbooks
- International cannabinoid research databases
- Patient PRO data across the platform
Returns: cannabinoid ratios, dose ranges, terpene profiles, evidence tier (RCT vs PRO vs experience).

---

### EMR-057: Native Mobile App (iOS, iPad, Android + Projector Support)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create the entire EMR as a NATIVE app that runs on iOS, iPad, and Android with:
- Proper dimensions, stretching, and seamless portrait/landscape mode
- Proper zooming proportions
- Proper stretching when connected via projector or HDMI
- Full feature parity with the web app
- React Native or Capacitor wrapper
**Supersedes/extends EMR-051.**

---

### EMR-058: Clinical Trial Matching + AI Summary Delivery
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Full framework connecting patient chart to the largest national clinical trial databases (ClinicalTrials.gov). Determines eligibility from patient data and recommends trials directly via:
- Patient portal message
- Email
- SMS
Each recommendation is AI-summarized and includes website, trial type, what it consists of.
**Extends EMR-052 (which scaffolded the UI).**

---

### EMR-059: Single-Page Fixed Prescription Module (No Scroll)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Redesign the prescription module to fit on ONE page that is FIXED without scrolling — all necessary parameters (name, dose, sig, days, qty, type, refills, diagnosis linking, interaction check, notes to patient/pharmacy) visible in a dense single-view layout.

---

### EMR-060: Zero-Scroll / Minimal-Click Information Architecture
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Audit the entire EMR to minimize clicks between tabs and eliminate scrolling wherever possible. Patients and providers should see all relevant information in a simple, clean format without scrolling up or down. Think dashboard density over portal-style pagination.

---

### EMR-061: Motivational Quote Pop-ups
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
- Pop-up motivational quote on login
- Every page has a quote that refreshes on navigation
- Keywords to sample from: God, love, faith, emotions, energy, happiness, resilience, persistence, not giving up, gratitude, healing, community
- Rotating quote library with attribution

---

### EMR-062: Ancillary Services Module (OT, PT, Speech, Case Mgmt, Home Health)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Ancillary EMR module covering:
- Occupational therapy documentation
- Physical therapy documentation
- Speech therapy documentation
- Case management notes
- Home health notes
Modular framework that integrates into the main EMR with provider sign-off and seamless communication between all service types.

---

### EMR-063: Pharmacy Communication Module
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Backend pharmacy communication module with direct access to pharmacists for clarifications or medication recommendations. Requires both pharmacist AND provider sign-off to verify and approve any change.

---

### EMR-064: Full Audit Trail & PDF Export
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Complete running log of all documentation, backend clicks, who accessed which chart, timestamps. Exportable as PDF for auditing purposes. HIPAA-compliant audit trail that meets regulatory standards.
**Note:** AuditLog model already exists — this extends it with the PDF export + comprehensive click tracking.

---

### EMR-065: Automated Compliance Audit AI Agent
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Automated AI agent that continuously audits notes, labs, communication for compliance:
- CMS standards
- Major insurance company audit requirements
- Joint Commission (JACHO) standards
Cross-checks everything against current regulations and flags non-compliant documentation before submission.

---

### EMR-066: Complete Validated Assessment Library
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Add ALL peer-reviewed validated surveys under the Assessments tab:
- Pain (PEG, BPI, NRS)
- Anxiety (GAD-7, STAI) ✓
- Insomnia (ISI, PSQI)
- Stress (PSS)
- Cancer (FACT-G, EORTC QLQ-C30)
- Depression (PHQ-9) ✓
- Cognition (MMSE, MoCA)
- Functional (ODI, WOMAC)
- And all other medical ailment-specific PROs
Each with scoring, interpretation, and trend visualization.

---

### EMR-067: Lab Ordering Module (Quest + LabCorp Integration)
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
Full lab ordering module connected to Quest and LabCorp:
- Cross-references patient's ICD codes for highest use
- Fully searchable lab database (every letter)
- User-defined lab sets saved as personal favorites
  - Example: "normal follow up" = Dx: E78.00, E11.9, Z79.899, I10; Labs: CMP, CBC, LIPID PANEL, A1C, GGT
- CRITICAL values auto-notify provider with required sign-off + plan of action documentation
- Patient-facing labs tab: view raw labs, print, download PDF, email, fax to other providers
- Nature-themed trend visualization: worse labs → worse weather + wilting plant; better labs → better weather + thriving plant
- All orders cross-referenced with highest-use ICD-10 + insurance coverage

---

### EMR-068: Patient Billing Portal with AI-Explained EOBs
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Full patient billing portal:
- Access to EOBs and invoices
- AI summarizes bills in 3rd-grade language (why, how much, what services, how to dispute)
- Direct payment into system
- File insurance claim to refute charges (tied to major insurers + CMS)
- Compliant with state insurance regulations
- Labs shown in red/yellow/green format (like drug interactions)
- AI suggestions for abnormal labs that providers can use to guide treatment

---

### EMR-069: AI Fairytale Chart Summary
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Full AI-driven summary of patient's chart as a ONE-PAGE summary that is:
- Easy for all providers to interpret
- Easy for the patient to understand
- Formatted as a BEAUTIFUL FAIRYTALE STORY BOOK that reads seamlessly
Covers pertinent history, medications, trends, concerns. Think "My Story" but generated on demand for any provider visit.

---

### EMR-070: USPSTF A&B Screening Measures with Emoji Checklist
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
- Implement all USPSTF A and B grade recommended screening measures as part of chart review
- Each prevention screening is an emoji that shows up if patient is DUE
- Pop-up prompt to provider: "consider discussing screening measures" with emoji list of pending items (pap smear, colonoscopy, mammogram, DEXA, CT chest screening, etc.)
- Simple emoji checklist included in AI fairytale summary that patient can take to all providers

---

### EMR-071: DoxGPT AI Chatbot Integration
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
AI chatbot integrating patient information with DoxGPT to obtain properly vetted resources and evidence-based treatment suggestions. Doctor has final say on all recommendations. Tied into messaging and care planning.

---

### EMR-072: Lifestyle Checkboxes → Plant Growth
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Add checkboxes next to every item on the Lifestyle tab:
- Each check = one new leaf on the plant
- One item from each of the 7 categories in a day = new stem
- One from each category every day for a month = flowers
Ties directly into the existing plant health system. Makes engagement tangible and rewarding.

---

### EMR-073: Customizable Patient Portal
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Let patients customize their portal:
- Organize tabs (show/hide)
- Rearrange tab order
- Change color palette (preset themes or free color picker)
- Save customization to their profile

---

### EMR-074: Patient Music Integration (Spotify / Apple Music)
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:**
Allow patients to connect Spotify or Apple Music to play music while reviewing their chart. AI fairytale summary gets an accompanying soundtrack that can be posted to social media or emailed. Think "Spotify Wrapped" energy for health.

---

### EMR-075: Social Sharing Module
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:**
Allow patients to share results and progress on:
- Lifestyle tab achievements
- Plant growth milestones
- Achievement unlocks
Shareable to Instagram, Facebook, TikTok with templated graphics.

---

### EMR-076: AI-First Prior Authorization Framework
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Prior authorization module where medications requiring PA are handled by AI first:
- AI pulls all needed data and proper coding
- Submits to insurance automatically
- Only if denied a second time does provider get pulled in
- In-system messaging + calls to insurance company for escalation

---

### EMR-077: Modular EMAR API Framework (All Pharmaceuticals)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Full modular API framework for electronic medication administration record (EMAR) including ALL current prescription medications:
- Doses, standard amounts, formulations
- Connected to major pharmaceutical companies
- Connected to pharmacy networks
- Real-time availability and pricing

---

### EMR-078: Smart Referral Module with AI Data Curation
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Referral module that lets patient look up specialists in their network by location + ratings. From within the EMR:
- Click specialist → create appointment OR generate call-patient request
- AI determines which notes, labs, consults, images are "pertinent" for the referral
- Auto-sends curated data bundle to the specialist's office

---

### EMR-079: Dementia / Alzheimer's Screening Framework (Mindspan Integration)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Full dementia/Alzheimer's framework:
- Connects to Mindspan.co for self-assessment memory tests within the EMR
- Stores results longitudinally
- Creates lifestyle plan to reduce dementia risk (exercise, reading upside down, outdoor time, etc.)
- Post-diagnosis: practical tips for improving quality of life for diagnosed patients
- Caregiver support module

---

### EMR-080: Cannabis Education Library (Legislation + Research)
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Cannabis education library that includes:
- All peer-reviewed journal articles (extend corpus)
- All patient data collected on the platform
- Current legislation at city, county, state, and federal level
- Auto-updated legal status by patient location
- Searchable + filterable

---

### EMR-081: OCR Document Scanning with AI Data Extraction
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Scanned documents (e.g., paper med list a patient brings in) are OCR-scanned and AI extracts:
- Medications → medication list
- Supplements → supplement list
- Surgeries → surgical history
- Emergency contacts → contact fields
All populated into proper chart fields in chronological order.

---

### EMR-082: Electronic Record Release Between Providers
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Electronic medical record release capability between doctors:
- Seamless acquisition of patient charts from other providers
- Patient electronic signature + provider signature
- Fully within the EMR — no paper forms

---

### EMR-083: Pediatric Module
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Pediatric module tracking:
- Growth charts (length, weight, head circumference)
- Vaccine schedule + history
- Weight and eating habits
- Developmental milestones
All visualized as a happy, cute cartoon theme — not clinical charts.

---

### EMR-084: Military-Grade Encryption, JACHO/CMS Compliance, IP Framework
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
- Military-grade encryption on the entire EMR and prompting system
- Cannot be copyrighted / reverse-engineered
- Legal framework for licensing to EPIC, Cerner, outpatient clinics, PT/OT locations, hospitals
- Meets ALL JACHO, CMS standards, regulations, guidelines for fully functional EMR
- Patents and trademarks for ALL aspects of the EMR
- Sample contracts for negotiating use with other entities

---

### EMR-085: Calendar Export (iCal, Google Calendar)
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
All scheduled appointments can be exported and added directly into patient's:
- Apple iCal
- Google Calendar
- Microsoft Outlook
ICS file generation, direct calendar sync, auto-update on reschedule.

---

## Expanded Summary

| Wave | Range | Status |
|---|---|---|
| Waves 1-7 | EMR-001 to EMR-036 (partial) | 33 done |
| Wave 8+ (Apr 10) | EMR-037 to EMR-055 | 11 done of 19 |
| Wave 9+ (Apr 10 expanded) | EMR-056 to EMR-085 | 30 new tickets |

**Total: 85 tickets across 30+ epics. 44 shipped, 41 remaining.**

**Product vision vs backlog** — several tickets in Wave 9+ are more product-vision than near-term backlog:
- EMR-057: Native mobile app (major architectural shift)
- EMR-077: Full EMAR API framework
- EMR-084: Military-grade encryption + IP / licensing framework
- EMR-076: Prior auth AI (needs insurance company integrations)
- EMR-067: Quest/LabCorp integration (needs partnership)

These are captured as tickets but flagged as strategic roadmap items, not immediate sprint work.

---

## Wave 16+ — Dr. Patel's Product Drop #4 (April 11, late)

### EMR-093: Four Pillars of Health Bar Graph
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create a "Four Pillars of Health" visualization on the Lifestyle tab: Physical, Mental, Emotional, and Spiritual. Each pillar rendered as a colored bar graph whose height/fill is computed from the underlying patient data:
- **Physical**: exercise logs, vitals, dose logs, outcome pain/sleep
- **Mental**: assessment scores (PHQ-9, GAD-7, CUDIT-R), cognitive check-ins
- **Emotional**: mood outcome logs, gratitude entries, positive input check-ins
- **Spiritual**: charity work, time with family/friends, meditation, higher-power connection (from EMR-095)

The visualization surfaces which pillar has the lowest "score" so the patient and care team can focus attention. Interactive — tap a pillar to drill into what's driving the score.

---

### EMR-094: Mental Health Chart Security Overlay
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
Mental health notes and chart documents must be separated from standard medical records with a security overlay. When a provider attempts to access any mental-health-tagged record, a popup requires them to electronically sign their name acknowledging HIPAA-sensitive access. Each access is logged in the immutable audit trail.

**Implementation:**
- New field on Note / Document: `sensitivity: "standard" | "mental_health" | "substance_use"`
- Access wall UI with forced e-signature
- Audit log entry for every access
- Specific providers (e.g. integrated BH) can have always-on access

Aligns with 42 CFR Part 2 substance-use confidentiality too.

---

### EMR-095: Spiritual Wellness Lifestyle Category
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Add a "Spiritual" category to the Lifestyle tab alongside sleep, nutrition, movement, stress, family, habits, and social. Tracks:
- Connection to higher power / faith practice
- Charity work and donations
- Time spent with family and friends
- Meditation / prayer / reflection time
- Nature / outdoor time

Feeds into EMR-093 (Four Pillars) and EMR-072 (lifestyle checkboxes → plant growth).

---

### EMR-096: Double-Blind Study Module
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Module that allows patient data to be incorporated into double-blind clinical studies and validated. Researcher creates a study protocol, randomizes patients (blinded), collects data from the EMR automatically, and generates results. Must preserve blinding and IRB-ready audit trail.

---

### EMR-097: Data Research & Reports Module
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
"Accounting software for clinical data." Operator can select and de-select any data point across the EMR, build custom datasets, and generate reports as:
- Bar charts
- Pie charts
- Line graphs / trends
- Projections / forecasts
- Pivot-style tables

Beautiful, graphically-pleasing interface (think Tableau meets Linear). Supports saved report templates.

---

### EMR-098: AI Coach with Personalized Style
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
AI coach that texts the patient at least 2x/day with encouragement or a push to keep going. Coach style is personalized based on the patient's emotional maturity + resilience:
- **Gentle**: warm, affirming, no pressure
- **Moderate**: balanced encouragement and challenge
- **Tough**: direct, drill-sergeant energy for patients who want accountability

Style is assessed at intake via a short questionnaire and can be changed anytime. Integrates with Twilio or similar for SMS. Coach references real patient data (today's check-ins, missed doses, goal progress).

---

### EMR-099: Endocannabinoid System Labwork Framework
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Modular labwork framework specifically for measuring the endocannabinoid system. Curated lab sets from Quest and LabCorp catalogs:
- Anandamide (AEA) levels
- 2-AG levels
- FAAH enzyme activity
- CB1/CB2 receptor expression (where available)
- Related inflammatory markers (CRP, IL-6, TNF-α)
- Cortisol (stress axis interaction)

Results flow into the patient chart with trends over time. Critical for dosing optimization and research.

---

### EMR-100: AI Tutorial Videos (30-second reels)
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
AI-generated tutorial videos for every EMR feature, delivered as short 30-second reels (Instagram-style carousel). Accessible from every page via a ? help icon. Video content auto-generated by narrating what the feature does while showing screen recordings.

---

### EMR-101: Complete CPT/ICD-10 Code Book + Superbills
**Priority:** 1 — Urgent
**Source:** Dr. Patel
**Description:**
- Full integration of the ENTIRE CPT code book (all ~10,000 codes, all modifiers)
- Full ICD-10 code set (~70,000 codes)
- Fully customizable superbills by specialty: family medicine, cardiology, oncology, gastroenterology, ophthalmology, etc.
- Procedural superbills per specialty
- AI overlay agent that pulls latest codes from CMS.gov and codify.com every 24 hours
- Auto-update when codes change annually

---

### EMR-102: Novel Cannabis ICD-10 / CPT Code Proposal
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Create a brand-new classification of ICD-10 and CPT codes specifically for cannabis medicine — cannabis use disorders, cannabis therapy for approved medical conditions, cannabis product dispensing, cannabinoid titration, etc. Robust and presentable to CMS as a formal proposal for inclusion in the next ICD-10-CM update.

---

### EMR-103: Practice Analytics Deep Dive
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Analytics dashboard showing practice-wide counts and trends for:
- Labs ordered / resulted
- Patient encounters by type
- Chart notes created / finalized
- Prescriptions written / refilled
- Messages sent / received
- Assessments completed
- Check-ins logged
Broken down by provider, patient cohort, time range.

---

### EMR-104: Click Counter / Workflow Efficiency Tracking
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Real-time click counter that measures how many clicks it takes to accomplish common tasks (start visit, finalize note, send Rx, check labs, etc.). Data drives ongoing UX optimization — the goal is to make every workflow as few clicks as possible. Per-user aggregations. "Average clicks to finalize a note: 7" should be a metric we can show and improve over time.

---

### EMR-105: Philanthropy / Donations Module
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:**
Module listing cannabis advocacy orgs and major medical charities the patient can donate to directly from the portal:
- Cannabis: Weed for Warriors, NORML, Last Prisoner Project, Sweetleaf Collective
- Medical: Susan G. Komen, Red Cross, St. Jude Children's Hospital, Cancer Research Institute
Track total donations per patient as a wellness metric (civic engagement feeds the Spiritual pillar).

---

### EMR-106: Hospital System Integration (Closed Loop)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Modular system that integrates outpatient clinics and inpatient hospitals into a closed loop. A patient's chart follows them wherever they go within the system — outpatient visit → ER admission → inpatient stay → discharge → back to outpatient follow-up. All data flows seamlessly. HL7 FHIR backbone.

---

### EMR-107: Expected Reimbursement Rate Prediction
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
For every encounter, display:
- Amount billed
- Expected to collect (based on contracted rates + historical data)
- Projection / variance explanation in 2 sentences with EOB codes
Use the information to auto-optimize coding for maximum reimbursement within compliance.

---

### EMR-108: Modular Full Revenue Cycle System
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Fully modular accounts receivable + billing/revenue cycle system based on insurance + ICD-10 + chart notes. Builds on the existing billing foundation (Phases 1-4 already shipped) but adds:
- Contracted fee schedule modeling
- Payer-specific rule packs
- Underpayment / downcode flagging at the claim level
- Cross-org benchmarking

---

### EMR-109: Age-Based Chart Overlays
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Pediatric, pregnant, adult, and geriatric chart overlays that unlock relevant features based on demographics:
- **Pediatric**: growth charts, weight/height percentiles, developmental milestones, vaccine schedule
- **Pregnant**: due date tracker, fetal growth, prenatal vitamin tracking, contraindication alerts
- **Adult**: USPSTF preventive screenings, MIPS measures
- **Geriatric**: falls risk, memory screening, balance precautions, polypharmacy review

System auto-selects based on DOB + intake answers, but provider can override.

---

### EMR-110: AI Patient Education Sheets by ICD-10
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Beautiful, colorful, one-page patient education sheets auto-generated for every ICD-10 code linked to the visit. Written at 3rd-grade reading level with pictures and practical explanations. Sharable via text, email, print, or in-portal. Provider can tweak before sending.

---

### EMR-111: Cannabis Education Database
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Proprietary cannabis education database with beautiful illustrations and simple terminology covering:
- Terpenes (profiles, effects, aromatherapy)
- Cannabinoids (THC, CBD, CBN, CBG, CBC, etc.)
- CB1 and CB2 receptors
- Dosing fundamentals
- Flavonoids
- Endocannabinoid system
Fully searchable directory. Builds on the existing Research Corpus (50+ studies already in place).

---

### EMR-112: Medication Wallet Card (Printable)
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Credit-card-sized printable card with the patient's current medications (cannabis + conventional + supplements). Auto-updates when meds change. Contains: name, strength, frequency. Portable so patients can carry it in their wallet. Downloadable PDF formatted for wallet dimensions.

---

### EMR-113: Allergies + Contraindications in Profile Tab
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Add a dedicated Allergies section and a Major Contraindications section to the Demographics/Profile tab. Currently the contraindication check runs on prescribe but the data isn't surfaced on the main chart. Make it a prominent top-of-chart alert that's visible from the first page load.

---

### EMR-114: Credit Card + ACH Payment Storage
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Secure tokenized storage of patient credit card and ACH details so they can pay bills directly from the portal. Receipts auto-generated with date, invoice number. Patient sees their credit balance (if any) or amount owed right on the billing tab. **Status: partially done — StoredPaymentMethod model exists; Payabli integration is scaffolded.**

---

### EMR-115: EOB Into Patient + Doctor Portal
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
When an EOB arrives from a payer, parse it and display it both in the patient portal (billing tab) AND the doctor's chart view. AI-summarized in plain language for patients. Shows what was billed, what was paid, what was adjusted, and what the patient owes.

---

### EMR-116: International Multi-Country Billing Framework
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
Modular billing system that adapts to every country's rules, regulations, and coding system. Integrated with major insurance carriers per country. Optimized for maximum reimbursement within local compliance. Starts with US, UK, Canada, Germany, Australia.

---

### EMR-117: iOS App Portrait Mode Nav Fix
**Priority:** 3 — Normal
**Source:** Dr. Patel
**Description:**
The native iOS app currently only shows the side nav options in landscape mode. Make all side options available in portrait mode as well, either via a collapsible drawer or a bottom tab bar that surfaces the most common destinations.

---

### EMR-118: Active Nav Tab Highlighting
**Priority:** 4 — Low
**Source:** Dr. Patel
**Description:**
When a user clicks a side nav tab, highlight it in a different color so they know what section of the chart they're on. Simple polish. **Status: done in Wave 17.**

---

### EMR-119: Tab Consolidation — Reduce Patient Chart Tabs
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
The patient chart is accumulating tabs (Demographics, Records, Images, Labs, Notes, Correspondence, Cannabis Rx, Billing — and more coming). Too many tabs is overwhelming for providers and patients. Think through which tabs can be consolidated, grouped, or moved to secondary navigation.

Proposed grouping:
- **Overview**: Demographics + summary
- **Clinical**: Notes + Labs + Images + Cannabis Rx (segmented control)
- **Documents**: Records + Correspondence (segmented control)
- **Billing**: stays dedicated
- **Tools**: Prepare for visit, Billing workqueue, Trials (collapsed menu)

---

### EMR-120: Medicare RPM Program Integration
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Integrate Medicare RPM (Remote Patient Monitoring) programs for diabetes, hypertension, and weight monitoring. Features:
- Pull RPM data from device partners (Omron, Dexcom, etc.)
- Auto-populate into patient vitals section with trends
- Code and bill to appropriate insurance (RPM CPT codes: 99453, 99454, 99457, 99458)
- Provider notification when new RPM data arrives
- "Reviewed" checkbox → digital signature → audit log footprint
- Comment box for provider free-response notes

---

### EMR-121: Master Access Log + Click Analytics
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Immutable master log recording every single chart access:
- Who logged in
- Timestamp
- What sections they viewed
- What edits they made
- How long they spent in the chart
Plus click analytics per role (patient, provider, office manager): average clicks per session, most-clicked destinations, workflow time-on-task.

Builds on the existing AuditLog model. Export as PDF for HIPAA audits.

---

### EMR-122: In-App Translation + Live Video Captions
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Translation layer for the entire platform:
- Messaging: auto-translate incoming/outgoing messages per patient language preference
- Secure video visits: live real-time caption translation
- Documents: OCR-scan-ready translation so patients can access their records in any language
- Supports at least: English, Spanish, Vietnamese, Gujarati, Hindi, Mandarin, Arabic, French

---

### EMR-123: Researcher / Scientist Portal with De-identified Data
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Entirely new authentication role: "researcher / scientist." Features:
- Access to de-identified patient data (no names, but keep DOB, race, sex, socioeconomic status, smoking/drug history, etc.)
- Modifiable analytics dashboard — researcher chooses the fields they want
- Upload their own data into the platform for community pooling
- Full data ownership — they can share, stop sharing, or delete anytime
- Penalty system for breaking subscriber contracts
- Powerful analytics software + API plugins for use on their own sites
- Data leasing model: researcher sets paid/free at their discretion
- "Open access" pooled framework anyone can contribute to
- AI overlay for natural-language search across the data (keywords, phrases, cohort queries)
- Create custom datasets + questionnaires within the portal

This is the research ecosystem layer that turns Green Path into a longitudinal cannabis care research platform, not just an EMR.

---

### EMR-124: Nav Tab Reduction Proposal (UX audit)
**Priority:** 2 — High
**Source:** Dr. Patel (duplicate of EMR-119 for tracking)
**Description:** See EMR-119.

---

### EMR-125: Volunteer & Donation Module with Geographic Registry
**Priority:** 1 — Urgent (Constitutional Article VII)
**Source:** Scott Wayman (Constitution pledge)
**Description:**
The beating heart of Green Path Health's community commitment. A full volunteer and donation tracking system baked into both the patient and provider portals.

**Core mechanics:**
- **Geographic registry**: Patients and providers see vetted volunteer opportunities within a 30-mile radius of their home address
- **Charity registry**: A curated list of reputable cannabis advocacy, medical, and community charities, audited daily by an AI compliance framework to protect against fraudulent activity
- **Target**: 10–20 hours per quarter for every engaged member (patients AND providers)
- **Logging**: Self-report hours with optional proof upload (photo, letter, event verification); volunteer coordinators on the partner side can confirm hours through a lightweight portal
- **Dual-credit**: Provider hours count toward both platform discount tiers AND CME credit where applicable

**Financial integration:**
- **Patient discount framework**: Patients who complete their quarterly volunteer hours are eligible for reduced medical bills OR may elect to donate the difference directly to a charity on our registry
- **Provider platform discount**: Providers and admin staff earn reduced platform fees tied to their volunteer engagement — the more they give, the less they pay for Green Path
- **Insurance carrier integration**: Formal engagement with payers to recognize volunteer work as an offset against patient responsibility. Any payer denial of a volunteer offset must be justified in writing and the justification logged in the platform for advocacy and transparency tracking

**Delight + motivation:**
- **Plant-growth integration**: Each logged hour animates a visible "growing plant" on the user's dashboard — a living, breathing visualization of their contribution. Over time the plant matures, branches, flowers
- **Certification generation**: Auto-generated beautiful certificates of volunteer service, shareable to LinkedIn, printable for personal records, and annotated with Green Path branding
- **Leaderboards (opt-in)**: Community boards celebrating top contributors, with privacy controls

**Tagline baked into the UI**: "We are not just creating a better EMR. We are creating better humans."

This is Article VII of the Constitution in code form. Must ship before the Patient Advisory Board is seated.

---

### EMR-126: Provider CME Credits via Medical Research Searches
**Priority:** 2 — High
**Source:** Dr. Patel
**Description:**
Automatically award CME (Continuing Medical Education) credits to providers when they conduct cannabis-related medical research inside Green Path — literature searches, study reviews, research corpus queries, de-identified data exploration.

**Mechanics:**
- Each substantive research session (time-on-task, query depth, references cited) accrues CME credit at a published rate
- Provider's NPI and state license numbers are linked to the account
- Completed CME credits can be **directly submitted to the provider's licensing body and specialty board** via integration partners (AMA, AOA, state medical boards, ACCME)
- Full audit trail of every credit earned: query, time, source material, certification hash
- "CME Ledger" page in the provider portal showing earned, pending, and submitted credits
- Annual summary PDF for tax and license renewal documentation

This turns every minute a provider spends researching cannabis medicine inside Green Path into professional value — making the platform not just a workflow tool but a career-development engine. Also a major recruitment lever.

---

### EMR-127: Green Path Health Charitable Fund + Transparent Ledger
**Priority:** 2 — High (Constitutional Article VII, §5)
**Source:** Scott Wayman (Constitution pledge)
**Description:**
Green Path Health operates its **own** charitable fund. A portion of platform revenue, volunteer-offset donations, and voluntary contributions flow into the fund, which distributes to reputable cannabis advocacy organizations and medical charities globally.

**Transparency requirements:**
- **Append-only public ledger** — blockchain-style design (signed, hash-chained, immutable). Anyone on the internet can view and verify every inflow and outflow
- No login required to audit the ledger. This is public accountability as a design principle
- Every transaction shows: date, amount, source category (revenue share / volunteer offset / voluntary donation), destination charity, purpose memo, verification hash
- AI compliance framework (same one used for Article VII §4 registry audit) performs daily integrity checks on the ledger and flags any anomaly
- Annual "State of the Fund" report generated automatically, signed by the co-founders

**Distribution governance:**
- Recipient charities must already be on the EMR-125 vetted registry
- Distributions proposed by co-founders, reviewed quarterly by Patient Advisory Board + Clinical Advisory Board
- No distribution to any organization with board overlap to Green Path leadership (hard conflict-of-interest rule)

This is how we prove — not claim — that we are not an extraction engine. The ledger is the receipt.

---

### EMR-128: Universal Feedback Icon with Visual Annotation
**Priority:** 2 — High
**Source:** Scott Wayman
**Description:**
A small, ever-present feedback icon fixed in a corner of every single page of the application — portal-wide, role-wide. One click opens a feedback capture flow that includes:

**Visual annotation:**
- Automatic screenshot of the current page state
- Drawing tools overlaid on the screenshot: freehand highlight, circle, arrow, box, text callout
- User can mark exactly the element they're frustrated by, the layout that confused them, or the copy they loved
- Optional voice memo attachment

**Routing:**
- All feedback is routed directly to a dedicated **C-Suite Admin inbox**
- Dr. Patel (CEO) and Scott Wayman (CPTO) review personally during the early period
- After seating, escalations and themes go to the Patient Advisory Board for UX consent review
- Auto-tagging by role, page URL, feature area, and sentiment (AI-classified)
- SLA: first human response within 72 hours during founding period

**Why this matters:**
We are trying to build something no one has built before. The people who use this platform are our partners, not our customers. Their feedback is the compass. Hiding behind a support email means we stop listening. A visible, always-on feedback icon means we are always listening — and the path from "I'm frustrated" to "the CEO sees it" is two clicks.

---

## Updated Summary (after Wave 16+ backlog expansion)

| # | Title | Priority | Status |
|---|---|---|---|
| 093 | Four Pillars Bar Graph | High | backlog |
| 094 | Mental Health Security Overlay | Urgent | backlog |
| 095 | Spiritual Wellness Category | Normal | backlog |
| 096 | Double-Blind Study Module | Normal | backlog |
| 097 | Data Research & Reports Module | High | backlog |
| 098 | AI Coach (gentle/moderate/tough) | High | backlog |
| 099 | Endocannabinoid Labwork | High | backlog |
| 100 | AI Tutorial Videos | Normal | backlog |
| 101 | Full CPT/ICD-10 Code Book + Superbills | Urgent | backlog |
| 102 | Novel Cannabis ICD-10 Code Proposal | High | backlog |
| 103 | Practice Analytics Deep Dive | High | backlog |
| 104 | Click Counter / Workflow Efficiency | Normal | backlog |
| 105 | Philanthropy / Donations Module | Low | backlog |
| 106 | Hospital System Integration | High | backlog |
| 107 | Expected Reimbursement Rate | High | backlog |
| 108 | Full Revenue Cycle System | High | partial |
| 109 | Age-Based Chart Overlays | High | backlog |
| 110 | AI Patient Education Sheets | High | backlog |
| 111 | Cannabis Education Database | Normal | backlog |
| 112 | Medication Wallet Card | High | backlog |
| 113 | Allergies + Contraindications Profile | High | backlog |
| 114 | Credit Card + ACH Storage | High | partial |
| 115 | EOB Into Portals | High | backlog |
| 116 | International Multi-Country Billing | Normal | backlog |
| 117 | iOS Portrait Mode Nav | Normal | backlog |
| 118 | Active Nav Tab Highlight | Low | **done** |
| 119 | Tab Consolidation Audit | High | backlog |
| 120 | Medicare RPM Integration | High | backlog |
| 121 | Master Access Log + Click Analytics | High | backlog |
| 122 | In-App Translation + Captions | High | backlog |
| 123 | Researcher / Scientist Portal | High | backlog |
| 124 | Tab Reduction (dup of EMR-119) | High | backlog |
| 125 | Volunteer & Donation Module (Constitutional Art. VII) | Urgent | backlog |
| 126 | Provider CME Credits via Research | High | backlog |
| 127 | Green Path Charitable Fund + Transparent Ledger | High | backlog |
| 128 | Universal Feedback Icon with Annotation | High | backlog |
| 129 | Provider Breathing Break Popup (30-min timer) | Normal | backlog |
| 130 | My Garden Cannabis Grow Guide + Community | High | backlog |
| 131 | AI Clinic Notes with Guardrails + Snapshot + APSO | High | backlog |
| 132 | Charting Timer (selling point vs other EMRs) | Normal | backlog |
| 133 | Patient Medication Explainer (3rd grade + cartoons) | High | backlog |
| 134 | Emotional Vitals Emoji Scale in APSO Notes | Normal | backlog |
| 135 | Voice Dictation (better than Dragon) | High | backlog |
| 136 | AI Consciousness Overlay — WE ARE THE COMPETITION | Normal | backlog |
| 137 | Fitness Module with Personal Trainers + Care Team | High | backlog |
| 138 | Mindfulness Emojis for Lifestyle | Normal | backlog |
| 139 | Food Photo OCR + Barcode + Macro Tracking | High | backlog |
| 140 | DICOM Viewer with Provider Annotations | High | backlog |
| 141 | Patient Imaging Tab (Read-Only Annotations) | High | backlog |
| 142 | Legal Module + AI Medico-Legal Library | Normal | aspirational |
| 143 | HIPAA-Compliant Zoom Integration | High | backlog |
| 144 | Emergency QR Code + NFC + Apple Wallet | High | backlog |
| 145 | Cannabis Dispensary Billing + CMS $500 Reimbursement | High | backlog |
| 146 | HIPAA Voicemail with Transcript | Normal | backlog |
| 147 | Modular EMR Licensing Menu (Michelin-style PDF) | High | backlog |
| 148 | Multi-Medication Prescribing + Double-Check | High | backlog |
| 149 | Read-Only Patient Story Share Link (ER/travel) | High | backlog |
| 150 | Cannabis Combo Wheel on Patient Tab + Landing Page | High | backlog |
| 151 | Symptom/Diagnosis Supplement Combo Wheel | High | backlog |
| 152 | Heart-Centric EMR Consciousness (Art. IV) | Normal | backlog |
| 153 | Marketing + Business Plan + Target Groups | High | backlog |
| 154 | FDA Rx Database + Cannabis Rx + Supplement Rec Module | Urgent | backlog |
| 155 | Hover-Over Lab/Result Explanations (Canopy/Enterprise) | High | backlog |
| 156 | Subscription Pricing vs EPIC/Cerner/Practice Fusion | High | backlog |
| 157 | Fix Claude Processing GIF Scroll Glitch | Urgent | backlog |
| 158 | Collapsible/Expandable Patient Outcomes Check-Ins | High | backlog |
| 159 | Remove or Merge "Care Plan" Patient Tab | Normal | backlog |
| 160 | Rethink "Assessments" Tab (physician-first workflow) | Normal | backlog |
| 161 | Merge Achievements + Lifestyle + Wearable Integration | High | backlog |
| 162 | Rework My Story → Focus on Storybook | High | backlog |
| 163 | Create "My Results" Patient Tab | High | backlog |
| 164 | Imaging Access with Radiologist Report + Image Toggle | High | backlog |
| 165 | Doctor Sign-Off Workflow for Patient Results | High | backlog |
| 166 | Medical Imaging Upload Backend (CT/MRI/X-ray/US/PET) | High | backlog |
| 167 | Full Offline + Airplane Mode Operation | High | aspirational |
| 168 | International Access Regardless of Country | High | aspirational |
| 169 | Full Dentistry Module | Normal | aspirational |
| 170 | C-Suite About Page Skeleton | Normal | backlog |
| 171 | Paramedic ↔ ER System Module | Normal | aspirational |
| 172 | Patient Mail/Fax OCR Scan + Insurance Cross-Check | High | backlog |
| 173 | 15-Day Cannabis EMR Launch Readiness | Urgent | backlog |
| 174 | Direct Insurance Company Phone Lines for Patients | Normal | aspirational |
| 175 | Military-Grade Cybersecurity + AI Self-Audit Suite | High | aspirational |
| 176 | Make EMR Fun and Engaging for ALL Users | Normal | backlog |

**Grand total: 176 tickets.** Product Drops #5 + #6 (48 new).
Neal, some of these are aspirational and we marked them that way — the spirit is right, the sequencing matters.
