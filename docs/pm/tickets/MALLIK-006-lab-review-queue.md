# MALLIK-006 — Lab Review Queue with auto-compare + outreach drafting

- **Parent:** MALLIK-005 (Mission Control epic)
- **Reporter:** Dr. Patel
- **Owner:** Mallik
- **Status:** ready-to-build (pending: Q1 lab data source decision from MALLIK-005)
- **Priority:** P0 — this is the single highest ROI item in the entire Mission Control PRD

## User story

As a physician, I want to review labs at a glance — current values vs. prior, with the major markers highlighted — and approve a whole batch of routine results with one password entry that auto-drafts patient and MA communication, so I stop copy-pasting values from a Word doc one lab at a time.

## Why now

Per Dr. Patel's interview (verbatim, `dr-patel-interview-1.md`):

> I have a Word document and I put copy and paste, like labs look good. Your LDL was 55, last time it was 45. Your A1C was 5.3, last time it was 5.2. I literally copy and paste from a Word document. ... Every single lab, I have to copy paste, write, manually write the lab numbers and then send it to my MA.

This is happening dozens of times a day. It's the most clicks-per-minute task in the EMR. Fixing it alone justifies the Mission Control epic.

## Scope

### In scope — Phase 1

**1. Lab Review Queue (compact list)**

- New component rendered as a module on `/clinic` (assembled by MALLIK-010) and as a standalone page at `/clinic/labs-review`
- Row fields: patient (first name + last initial — per Dr. Patel), test panel name (e.g. "CMP", "Lipid panel", "HbA1c"), received date, abnormal-flag indicator, checkbox for batch
- Sort: newest first. Filter: all / abnormal only / unsigned only
- Empty state when queue is clear

**2. Lab detail overlay**

Click a row → overlay (not a new page). Overlay shows:

- **Current values table**, with the six priority markers highlighted:
  - LDL
  - HDL
  - Total cholesterol
  - A1C
  - Creatinine / GFR
  - LFTs (AST, ALT, ALP, bilirubin)
  - PSA (when panel includes it)
- **Prior comparison column** with delta (arrow + value, color-coded: green if better, amber if trending wrong, red if abnormal jump)
- **1–3 sentence plain-language blurb** per non-obvious marker (Dr. Patel asked for this explicitly) — precomputed at build time, not AI-generated at view time (performance)
- **Reference ranges** shown inline
- **Active diagnoses + active medications** panel (read-only context)
- **Action bar at the bottom** (see below)

**3. Action bar on the overlay**

- **"Looks good"** → triggers AI draft (see #4)
- **"Needs follow-up"** → opens a short text field, adds to physician's own task list
- **"Repeat test"** → opens a small form to queue a new lab order (stub for Phase 1 — creates a Task, not a real order transmission)
- **"Route to MA"** → adds to MA's queue with a one-line note
- **Checkbox: "Add to batch sign"** → marks this lab for the tray at the bottom of the queue
- Close (X) → returns to the queue

**4. AI-drafted outreach (Lab Summarizer Agent)**

On "Looks good" click:

- Call a new agent `labSummarizer` (see AGENTS.md pattern — new agent file at `src/lib/agents/lab-summarizer-agent.ts`)
- Inputs: current values, prior values, active dx, current meds
- Outputs:
  - Patient-friendly message ("Your LDL is 55. Last time it was 45. Your A1C is 5.3. Last time it was 5.2. Overall your labs look stable. Continue diet, exercise, and current meds.")
  - MA task text (one-liner: "Call James re: labs, tell him stable, keep current meds")
  - Physician-facing summary (one-liner for the chart)
- The three drafts are rendered **preview first, send second** — physician approves or edits before anything leaves.
- Output routing options (Dr. Patel asked for these): MA task / patient portal secure message / SMS text / **voice message in physician's voice** (Phase 3, stub in Phase 1) / printable PDF / fax (Phase 3, stub in Phase 1)

**5. Batch sign & send**

- Bottom tray on the queue shows items checked "Add to batch sign"
- One password / re-auth entry signs all items in the batch
- Each item's corresponding outreach draft is sent via its chosen routing on successful sign
- An `AuditLog` row is written per signed lab (actor = physician, action = "lab.sign", target = lab ID, payload = { routing, outreach_draft_id })

### Out of scope for MALLIK-006

- Real lab feed ingestion (Quest / LabCorp / HL7 / FHIR) — depends on Q1 in MALLIK-005. Phase 1 uses fixtures.
- Voice message generation in physician's voice — deferred to Phase 3, UI stub only in Phase 1.
- Fax transmission — deferred to Phase 3, UI stub only in Phase 1.
- Drag-resize of the queue module — deferred to MALLIK-010 / dashboard-grid work.

## Data model additions

New Prisma models (pending lab-feed decision — fixtures use the same shape):

```prisma
model LabResult {
  id              String   @id @default(cuid())
  organizationId  String
  patientId       String
  panelName       String   // "CMP", "Lipid panel", "HbA1c", ...
  receivedAt      DateTime
  results         Json     // { marker: { value, unit, refLow, refHigh, abnormal } }
  signedById      String?
  signedAt        DateTime?
  outreachId      String?  // link to LabOutreach
  createdAt       DateTime @default(now())
  @@index([organizationId, signedAt])
}

model LabOutreach {
  id              String   @id @default(cuid())
  labResultId     String   @unique
  patientDraft    String   // AI-drafted patient-friendly message
  maDraft         String   // AI-drafted MA task text
  physicianNote   String   // AI-drafted chart one-liner
  routing         Json     // { patientMessage, sms, voice, pdf, fax, maTask }
  status          String   // "draft" | "approved" | "sent"
  approvedById    String?
  approvedAt      DateTime?
  createdAt       DateTime @default(now())
}
```

## New Agent

- `labSummarizerAgent` in `src/lib/agents/lab-summarizer-agent.ts`
- Follows the `AGENTS.md` contract exactly (input schema, output schema, allowed actions, requires approval)
- `requiresApproval: true` — outreach never sends without physician sign
- Registered in `src/lib/agents/index.ts`

## Acceptance criteria

- [ ] Lab Review Queue renders at `/clinic/labs-review` with seeded fixture data (5–10 demo labs across Maya / James / Sarah)
- [ ] Click a lab → overlay opens with current vs prior side-by-side, priority markers highlighted
- [ ] Plain-language marker blurbs render for LDL / HDL / A1C / GFR / LFTs / PSA
- [ ] "Looks good" → AI-drafted patient message + MA task + chart note render in a preview panel
- [ ] Physician can edit any of the three drafts before approving
- [ ] Checkbox marks a lab for batch; bottom tray shows count and "Sign & Send All"
- [ ] Batch sign requires re-entering password; all items sign atomically (or fail atomically)
- [ ] One `AuditLog` row per signed lab with actor/action/target/payload
- [ ] Abnormal labs cannot be added to the batch — the checkbox is disabled with a tooltip explaining why
- [ ] Click counter (measured on the demo fixtures): review + sign 4 labs in ≤15 clicks total (vs. ~40 in the current flow)

## Open questions (blocking handoff to eng)

1. Lab data — fixtures only in Phase 1, or real feed? (Blocks Prisma schema finalization.)
2. Re-auth for batch — password re-entry every time, or session-valid for N minutes?
3. Abnormal threshold — who defines? Use reference ranges from the lab, or our own override table?
4. Patient-facing message — portal only, or SMS too in Phase 1? (SMS requires Twilio/telephony integration.)
5. Accessibility — the overlay must meet our existing a11y bar. Anything specific for the color-coded delta indicators (colorblind considerations)?
