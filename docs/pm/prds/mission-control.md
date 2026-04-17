# PRD — Physician Mission Control

- **Epic ticket:** MALLIK-005
- **Owner:** Mallik
- **Status:** approved-to-plan
- **Source materials:**
  - `docs/pm/research/dr-patel-interview-1.md` (workflow walk-through, 2026-04-17)
  - `docs/pm/research/dr-patel-interview-2.md` (chart / encounter / billing follow-up, 2026-04-17)
  - `docs/pm/wireframes/dr-patel-mission-control-v1.md` (hand-drawn provider front page, 2026-04-17)
  - `docs/pm/decisions/` — product decisions that override Dr. Patel's stated preferences
  - Synthesized PRD draft (included below, rewritten into Leafjourney terms)

## Product thesis

The EMR should stop behaving like a filing cabinet and start behaving like a **clinical operations co-pilot**. Every screen should reduce clicks, eliminate copy-paste, accelerate physician review, preserve safety, and generate cleaner downstream communication to staff, pharmacies, billing, and patients.

Mission Control is the physician's home screen. It surfaces the four operating lanes of the day at a glance, lets the physician knock out routine work at scale, and preserves their attention for actual medicine.

## Primary user

Outpatient physician (Dr. Patel is our archetype) managing high daily volume across:

- Labs
- Imaging and outside documents
- Medication refills
- Patient messages
- Encounter notes
- Billing / superbill sign-off

## The four operating lanes

| # | Lane | Current workflow pain | Mission Control answer |
|---|------|----------------------|------------------------|
| 1 | **Document review** (labs, imaging, sleep, colonoscopy, PT, prior auths) | Opens a doc, copy/pastes a Word template, manually types current vs prior values, password sign-off, manually tasks MA to call/email the patient. Repeat dozens of times per day. | Compact review queue per doc type. Overlay auto-shows current vs prior values. One click "looks good" auto-drafts the patient/MA communication. Batch sign-off for routine items; escalation for abnormal ones. |
| 2 | **Messages & refills** | Messages and refill requests arrive all day. Refills processed one at a time — check chart, check last lab, verify pharmacy, approve, done. Hundreds of clicks. | Compact refill queue with first-name/last-initial + drug + dose + qty + pharmacy + "last relevant lab" shown inline. Check → batch sign & send to pharmacy. Message center with AI-labeled actions (call / prescribe / review / delegate / routine). |
| 3 | **Patient encounter** | Physician sees patient → takes notes on paper → retypes into Word → pastes into EMR → manually types vitals. Charting happens outside the system. | Note authoring begins inside the encounter. Vitals flow in automatically. Ambient scribe / dictation / handwriting-OCR all roll into the same structured draft the clinician can sign. |
| 4 | **Note completion & billing** | Hand-circles CPT codes on a paper superbill, faxes to billing company. | Completing the note surfaces suggested ICD-10 / CPT / E&M codes from note content. Digital superbill; physician reviews & signs; exports to billing partner. Audit trail preserved. |

## Dashboard module inventory (Phase 1 scope)

Based on Dr. Patel's drawing + interview, the physician's home page becomes a **grid of adjustable modules**. Each module has scroll-within, a compact summary, and an overlay for the detail view.

| Module | Priority | Covered by existing code? | New build |
|--------|----------|----------------------------|-----------|
| **Today** — time/weather/date/day snapshot | P2 | partial (greeting exists) | small widget |
| **Schedule** — scrollable day/week/month | P1 | partial (today's schedule list on `/clinic`) | upgrade to scrollable w/ day/week/month toggle (see MALLIK-002) |
| **Refill Queue** — compact cards, batch sign/send | **P0** | no | full module |
| **Lab Review** — compact rows, auto-compare overlay, auto-draft outreach | **P0** | no | full module |
| **Imaging & Document Review** — same pattern as labs for non-lab docs | P1 | no | full module (pattern shared with Lab Review) |
| **Message Center** — email-style triage with AI labels | P1 | partial (`/clinic/messages` exists) | upgrade to AI-labeled + quick actions |
| **Mindful Module** — 30-min rotating breathing / quote / sound prompt | P3 | no (BreathingBreak component exists but isn't a dashboard module) | small widget |
| **Search bar** — GPT-style "search all records" | P2 | partial (command palette exists) | elevated dashboard search input |
| **Sign Off (multi-doc)** — combined sign-off tray | P1 | no | bottom-tray pattern |

Note on the grid: Dr. Patel explicitly called out **"every window adjustable size/length, can move around home screen but locks onto grid."** That's a draggable dashboard (e.g. react-grid-layout). Treat as **Phase 1 polish** — static grid first, drag-to-reposition later. Don't gate Phase 1 on it.

## AI copilots required

The modules lean on five AI copilots. Some already exist in the agent fleet (`AGENTS.md`), some are net-new:

| Copilot | Exists? | Purpose |
|---------|---------|---------|
| **Lab Result Summarizer** | new | Given current + prior lab values + active dx + med list, produce a physician-facing summary, a patient-friendly message, an MA task. |
| **Refill Copilot** | new | Given med history + last visit + last related lab + pharmacy + PA history, suggest approve/deny with safety flags. |
| **Message Triage Agent** | ~ existing `messagingAssistant` | Category + urgency + suggested action + draft response. |
| **Clinical Note Copilot** | existing `scribe` agent | Encounter → structured note draft. Already in the fleet. |
| **Outreach Agent** | ~ existing `messagingAssistant` | Physician-approved result → text / secure message / voice / MA task / printable letter. |

## Safety rails (non-negotiable)

1. Physician remains the **final signatory** for every clinical decision.
2. Any batch action requires an explicit review state + authentication.
3. AI-generated communications are **previewable before send** — no silent outreach.
4. High-risk labs and abnormal imaging **cannot be auto-batched** — they are auto-escalated out of the batch lane.
5. Full audit log for edits, sign-offs, routing, external communications. Already covered by the existing `AuditLog` pattern in `AGENTS.md`.
6. OCR extraction from handwritten notes **requires physician validation** before clinical or billing submission.
7. Refill engine must surface medication-specific safety checks (e.g. opioid MME thresholds, benzo + opioid combos, renal dose adjustments).

## Phasing

### Phase 1 — highest leverage quick wins (~2–3 weeks)

- **MALLIK-006** Lab Review Queue with auto-compare + patient/MA message drafting
- **MALLIK-007** Refill Queue with batch sign & send
- **MALLIK-008** Document Review Queue (imaging, sleep studies, PT notes, prior auths)
- **MALLIK-009** Message Triage upgrade on `/clinic/messages`
- **MALLIK-010** Mission Control dashboard assembly — static grid that composes the new modules on `/clinic`

Ship order: 006 → 007 → 008 → 010 → 009. 006 and 007 are the "pain relief" payload; 010 makes them visible as a unified surface; 008 clones the 006 pattern; 009 polishes the inbox.

### Phase 2 — encounter & charting (~4–5 weeks)

Expanded by Interview 2. Ticket IDs **reserved**; full spec bodies filed when Phase 1 is in user testing so they can incorporate learnings.

- **MALLIK-014 — Chart Opening View.** When a clinician opens a patient chart, the landing view surfaces critical context in one glance: latest labs (A1C, LDL, HDL, total cholesterol, GFR, LFTs, thyroid if applicable), active problem list, active meds, most recent encounter summary, open tasks, care gaps. (Source: Interview 2, "I open it, it has all the stuff I need from their chart, their latest labs, like their critical numbers.")
- **MALLIK-015 — Encounter note authoring (dictation + ambient scribe).** Multiple input modes: (a) structured typing, (b) dictation with autopopulation, (c) opt-in ambient scribe that AI-structures the visit. All three pipelines converge into the same SOAP-structured draft for review. Dictation is Dr. Patel's stated preference; ambient is opt-in per clinician (see `docs/pm/decisions/2026-04-17-ai-note-taking-override.md`).
- **MALLIK-016 — Vitals auto-ingestion (wireless device integration).** Wireless BP cuff, pulse ox, thermometer, scale. Otoscope / ophthalmoscope / digital stethoscope as stretch goals. Device → room → patient → chart binding. Likely a per-device integration layer (BLE / WiFi / vendor APIs). Split into sub-tickets per device family.
- **MALLIK-017 — Drag-and-drop ICD-10 / diagnosis linking.** Type "anxiety" in the assessment; system suggests F41.1 and adjacent codes; drag to the problem list or visit diagnosis. Also: bidirectional — dragging a diagnosis off the chart removes it from active.
- Imaging / document AI summaries inside the review overlays (carries over from PRD original).

### Phase 3 — billing, OCR, outreach (~4–5 weeks)

Expanded by Interview 2 — billing gets much more specific.

- **MALLIK-018 — Digital superbill generated from AI note.** The AI-structured note (MALLIK-015 output) feeds into an AI coder that produces a digital superbill: ICD-10 codes, CPT codes, E&M level, modifiers. Physician reviews, edits, signs. Replaces the paper-circle + fax workflow.
- **MALLIK-019 — Bill-level optimization ("bill at highest appropriate amount").** The AI coder should recommend the highest E&M level supported by the note content + MDM criteria — without upcoding. This is a compliance surface: documentation must justify the level. Build in a "coding justification" panel that shows *why* the level was chosen from the note content, so the physician can verify / down-code if appropriate.
- **MALLIK-020 — Payment tracking from superbill.** Once the superbill is signed + exported to the billing partner, the EMR tracks status back: submitted → accepted → paid / denied → reason. Surfaces overdue / denied claims on the physician's dashboard and the billing-team ops console. (Source: Interview 2, "so we can then track and see, is the patient paying or not?")
- Handwritten note OCR pipeline with physician validation step (carries over from PRD original).
- AI voice / text patient outreach (carries over — includes "voice in physician's voice" from Interview 1).
- Population-level trend analytics on the dashboard's right rail (carries over).

## Product decisions log

Decisions that diverge from Dr. Patel's stated preferences in the research interviews are captured in `docs/pm/decisions/` as dated markdown files. Operating rule: Dr. Patel describes his workflow, pain, and wishes; the product owner (Scott) decides what ships.

- `decisions/2026-04-17-ai-note-taking-override.md` — AI-assisted note-taking is in scope for Phase 2 (ambient scribe opt-in per clinician, dictation always available, AI draft refinement always on). Overrides Dr. Patel's "not really big on AI recording" preference.

## Success metrics

Track these from Phase 1 launch onward:

- **Clicks per lab review** (target: ≤3, down from Dr. Patel's current 10+)
- **Time per refill** (target: ≤10s, down from 60–90s currently)
- **Same-day chart closure rate** (target: >80%)
- **Time from result receipt to patient communication** (target: <2h median)
- **Billing turnaround time** (target: <24h from visit to billing partner)
- **% of vitals auto-ingested** (target: 100% once device feed or staff UX is wired)
- **Copy-paste workflow events per physician per day** (target: 0)
- Physician & MA satisfaction (qualitative — NPS question after each phase)

## UI principles

- **Fewer screens. Fewer clicks. Overlays, not tabs.**
- Each module has a **compact summary row** + an **overlay detail view**. No sub-page drilldowns.
- Batch where safe. Individual where it matters.
- Every action answers: **review / sign / route / communicate**.
- The dashboard should be **scannable in 3 seconds**. Anything that takes longer belongs in an overlay.

## One-line product promise

> Open the EMR, see the day clearly, clear routine work fast, and keep your brain for actual medicine.

## Open questions before Phase 1 build

1. **Lab data source.** We don't yet have lab ingestion wired — are labs currently stored in our DB, or do we mock against a test fixture for MALLIK-006 and wire the real feed in a separate ticket? (Likely fixture first; real feed = separate integration effort.)
2. **Pharmacy roundtrip.** Batch "sign & send to pharmacy" — do we send via Surescripts/EHR integration, or generate a fax PDF for now? Affects MALLIK-007 scope materially.
3. **Grid-vs-fixed-layout.** Static grid for Phase 1, drag-resize in a later polish ticket?
4. **Same page or new page.** Evolve existing `/clinic` into Mission Control, or add `/clinic/mission-control` as a separate route and let clinicians choose? (I lean evolve.)
5. **Mobile?** Dr. Patel described a desktop workflow. Is tablet/mobile in scope for Phase 1 or deferred?
