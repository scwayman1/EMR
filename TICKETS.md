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
| 001 | Cannabis Combo Wheel | High | Pharmacology | backlog |
| 002 | Dispensary Integration & SKU Scanning | High | Pharmacology | backlog |
| 003 | Milligram-Based Dosing Display | High | Pharmacology | partial |
| 004 | Dosing Recommendation Engine | Normal | Pharmacology | backlog |
| 005 | AI-Powered Billing & CPT/ICD-10 | High | Billing | partial |
| 006 | LIFESTYLE Module | Urgent | Lifestyle | backlog |
| 007 | AI-Powered Supply Store | Normal | Supply Store | backlog |
| 008 | Educational Library | High | Education | backlog |
| 009 | 3rd-Grade Reading Level Explainer | Normal | Education | backlog |
| 010 | Visual Health Roadmap | High | Education | backlog |
| 011 | Personal Vitals Wording | Low | Education | backlog |
| 012 | Scheduling Module + SMS | High | Scheduling | partial |
| 013 | Conventional EMR Integration | Normal | Integration | backlog |
| 014 | DICOM Viewer & PACS | Low | Infrastructure | stub |
| 015 | Justin's UI Feedback | Normal | UI Polish | partial |
| 016 | Full Prescription Form (Rx v2) | Urgent | Prescribing | backlog |
| 017 | Dispensary Locator (Google Maps) | High | Prescribing | backlog |
| 018 | Leafly Strain Database Integration | Normal | Pharmacology | backlog |
| 019 | Full Demographics Tab | High | Demographics | backlog |
| 020 | APSO Note + Wearable Integration | High | Documentation | backlog |
| 021 | AI-Recommended Initial Plan | High | Documentation | backlog |
| 022 | Cannabis Plant Health Companion | High | Gamification | backlog |
| 023 | Gamify Health (Apple Rings) | Normal | Gamification | backlog |
| 024 | Positive Input Requirement | Normal | Gamification | backlog |
| 025 | Cannabis Design Palette | High | Design | backlog |
| 026 | Cannabis Emojis | Low | Design | backlog |
| 027 | Platform Disclaimer | Low | Design | backlog |
| 028 | Split Window / Multi-Tab | High | Platform | backlog |
| 029 | ADA Compliance | High | Platform | backlog |
| 030 | Multi-Language Support | Normal | Platform | backlog |
| 031 | Responsive Cross-Device | High | Platform | backlog |
| 032 | Patient Email/Print Documents | Normal | Platform | backlog |
| 033 | Physician-to-Physician Portal | High | Communications | backlog |
| 034 | Phone & Video in Messaging | Normal | Communications | backlog |
| 035 | Backend Data Dashboard | Normal | Analytics | backlog |
| 036 | Justin's Book in Library | Low | Education | backlog |
