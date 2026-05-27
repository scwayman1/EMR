# MALLIK-007 — Refill Queue with batch sign & send

- **Parent:** MALLIK-005 (Mission Control epic)
- **Reporter:** Dr. Patel
- **Owner:** Mallik
- **Status:** ready-to-build
- **Priority:** P0 — second-highest ROI item in Phase 1 (refills are the second-biggest click offender after labs)

## User story

As a physician, I want a compact refill queue on my home screen showing patient + drug + dose + quantity + pharmacy at a glance, with inline controls to approve / adjust / deny and a batch "sign & send all" button at the bottom, so I stop processing refills one-at-a-time with four tabs open.

## Why now

Dr. Patel, verbatim (`dr-patel-interview-1.md`):

> Refills are frustrating. I usually have to refill, I have to look, make sure that they need it, make sure that the last time they checked, and also make sure it's the right pharmacy. So I need to make sure all those parts are in place. Usually I only do one at a time. It'd be great if I'm on a patient's chart, I can do like multiple, same thing, batch click them, and then send it to the pharmacy.

## Scope

### In scope — Phase 1

**1. Refill Queue (compact list)**

Rendered as a module on `/clinic` (composed by MALLIK-010) and as a standalone page at `/clinic/refills`. Each row:

- Patient label: **first name + last initial** (Dr. Patel specified — privacy + scannability)
- Drug name
- Dose + frequency (e.g. "20mg daily")
- Quantity requested (e.g. "#90")
- Pharmacy name
- Refill status chip (new / approved / flagged / sent)
- Last visit date
- "Last relevant lab" date when the drug class requires it (e.g. metformin → A1C, statin → LFTs, warfarin → INR). The mapping lives in a small static table — no ML, just a lookup.
- Safety flag badge if the refill copilot raised one (see #3)
- Checkbox for batch sign
- Inline action buttons: **approve / deny / edit / open detail**

Sort: oldest-pending first. Filter: all / flagged only / same-pharmacy only.

**2. Refill detail overlay**

Click a row → overlay (not a new page). Shows:

- Full patient name, DOB, active problem list, allergies
- Full pharmacy info (name, address, phone, NPI if we have it)
- Insurance info (if relevant — PA history flag)
- Full refill history for this drug over the last 18 months
- Last clinician note that mentions the medication (extracted snippet)
- Safety checks panel (see #3)

Actions from the overlay: approve / deny / edit dose / edit quantity / change pharmacy / route to MA / add to batch.

**3. Refill Copilot (new agent)**

- Path: `src/lib/agents/refill-copilot-agent.ts` following the `AGENTS.md` contract
- Inputs: medication, patient history, last relevant lab, pharmacy, PA history
- Outputs: `{ suggestion: "approve" | "deny" | "review", safetyFlags: string[], rationale }`
- **Hardcoded safety flags** (non-negotiable, enforced regardless of AI output):
  - Opioid MME threshold crossed
  - Opioid + benzodiazepine co-prescription
  - Renal dose adjustment needed (GFR < 30) for renally-cleared drugs
  - Controlled substance exceeds monthly supply
  - Pharmacy-on-file mismatch (flag if different from last fill)
  - Last relevant lab > 12 months old for drug classes that need monitoring
- `requiresApproval: true` — physician always signs
- Flagged refills **cannot** enter the batch lane. The checkbox is disabled with a tooltip explaining the flag.

**4. Batch sign & send**

- Bottom tray shows all checked refills with a single "Sign & Send All" button
- Password re-auth required (same policy decision as MALLIK-006 — whatever we land on there, match here)
- On sign: generate a **fax PDF per refill** (Phase 1 transmission — see #5), write `AuditLog` per refill, update status to `sent`
- Batch is atomic per item, not atomic across items — one failure doesn't halt the rest (but fails visibly)

**5. Transmission — fax PDF stub (Phase 1 per user decision)**

- On batch sign, each refill produces a fax-ready PDF: patient identifier, drug, dose, frequency, qty, refills, prescriber signature block, date, NPI, DEA (if controlled)
- PDFs are generated but NOT transmitted — saved to the `/clinic/refills/outbox` view for the MA to fax manually, OR downloaded by the physician
- Surescripts e-prescribing is the Phase 2 replacement (see MALLIK-012 backlog)

### Out of scope — Phase 1 (backlog tickets exist)

- Real e-prescribing / Surescripts (→ MALLIK-012, Phase 2)
- Controlled-substance EPCS workflow (requires two-factor + attestation — separate compliance epic)
- Auto-approval of truly routine refills without physician sign (safety: never in V1, maybe V3 with much more rigor)

## Data model additions

```prisma
model RefillRequest {
  id                String    @id @default(cuid())
  organizationId   String
  patientId         String
  medicationId      String    // FK to existing Medication
  requestedQty      Int
  requestedDays     Int?      // days supply
  pharmacyId        String
  receivedAt        DateTime  @default(now())
  status            String    // "new" | "flagged" | "approved" | "sent" | "denied"
  copilotSuggestion String?   // "approve" | "deny" | "review"
  safetyFlags       Json      // string[]
  rationale         String?   // copilot's reasoning, rendered in the overlay
  signedById        String?
  signedAt          DateTime?
  faxPdfUrl         String?
  createdAt         DateTime  @default(now())
  @@index([organizationId, status])
}
```

## Acceptance criteria

- [ ] Refill queue renders at `/clinic/refills` with seeded fixture data across demo patients
- [ ] Each row shows: first name + last initial, drug, dose, qty, pharmacy, last relevant lab date, safety-flag badge (if any)
- [ ] Click a row → overlay opens with full patient + pharmacy + insurance + history
- [ ] Flagged refills cannot be added to batch; checkbox disabled with tooltip
- [ ] "Sign & Send All" requires re-auth; generates fax PDF per refill; writes `AuditLog`
- [ ] On the demo fixtures, approve + sign 5 routine refills in ≤10 clicks total (baseline: ~40–50 clicks)

## Open questions

1. Does our `Medication` / `Prescription` schema already carry pharmacy + dose + qty + refills-remaining? If not, MALLIK-007 expands.
2. MA can fax the PDF manually, or do we integrate a fax provider (Faxage / SRFax / Phaxio) in Phase 1? **Recommend:** manual fax in Phase 1, provider integration in the Surescripts-era refactor.
3. Drug-class → monitoring-lab lookup table — where does it live? Probably `src/lib/domain/drug-monitoring.ts`, seeded from a small JSON.
