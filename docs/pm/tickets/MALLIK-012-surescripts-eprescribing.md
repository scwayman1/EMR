# MALLIK-012 — Surescripts e-prescribing integration (Phase 2 backlog)

- **Parent:** MALLIK-005 (Mission Control epic)
- **Reporter:** Dr. Patel
- **Owner:** Mallik
- **Status:** backlog (Phase 2 per decision — MALLIK-007 ships on fax PDF stub for demo)
- **Priority:** P1 for Phase 2 kick-off

## Problem

MALLIK-007 ships a Refill Queue that generates fax-ready PDFs — the MA still has to manually fax or mail each prescription. The production answer is Surescripts NCPDP SCRIPT e-prescribing so refills and new prescriptions flow directly from the EMR to the patient's pharmacy.

## Work items

- **Surescripts certification**: EHR-to-Surescripts certification is a formal process (audit, compliance review, test transactions)
- **NCPDP SCRIPT v2022.011** message construction for NewRx, RefillRequest, RefillResponse, CancelRx
- **EPCS (Electronic Prescribing of Controlled Substances)** — separate compliance layer requiring two-factor auth + prescriber attestation. Split into sub-ticket.
- **Pharmacy directory / SPI lookup** — pharmacy name → Surescripts Provider ID
- **Prescriber credentialing in Surescripts** — DEA + NPI + state license per provider
- **PA (prior auth) message flow** — inbound PA requests as part of the Surescripts roundtrip
- **Replace fax PDF stub** in MALLIK-007 with Surescripts send path; retain PDF as a fallback

## Dependencies

- MALLIK-007 shipped and stable on fax PDF
- Commercial agreement with Surescripts (application + fees)
- EPCS requires an identity proofing + hard token for controlled substances — the practice has to adopt a compliant workflow

## Definition of "not in this ticket"

This ticket stays a placeholder until we have:

1. Surescripts commercial agreement in motion
2. At least one provider enrolled + credentialed in the Surescripts network
3. A timeline that makes the certification work worth starting

Then split into the work items above as proper stories.
