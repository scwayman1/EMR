# MALLIK-011 — Real lab feed integration (backlog — Phase 2+)

- **Parent:** MALLIK-005 (Mission Control epic)
- **Reporter:** Dr. Patel
- **Owner:** Mallik
- **Status:** backlog (per decision: Phase 1 ships on fixtures; real feed is its own epic)
- **Priority:** P2 (essential for production, not blocking demo)

## Problem

MALLIK-006 ships with fixture-only lab data for the demo. Production use requires ingesting real lab results from external sources (Quest, LabCorp, BioReference, in-house lab analyzers, hospital reference labs).

## Work items (TBD — one ticket per feed)

- **HL7 v2 ORU^R01** listener and parser (most common inbound format)
- **FHIR R4 DiagnosticReport / Observation** ingestion for modern integrations
- **Direct Quest / LabCorp APIs** where available
- Mapping layer: external codes (LOINC) → our internal marker model
- Deduplication of multi-source labs for the same order
- Reference range normalization across labs
- Backfill strategy for historical data
- Error / unparseable-result handling + MA queue for manual reconciliation

## Dependencies

- BAA / HIPAA security review before connecting any real lab feed
- Practice-level credentials + account setup per integration
- Each lab network's sandbox / certification process (Quest certification typically takes weeks)

## Definition of "not in this ticket"

This ticket stays a placeholder in the backlog until we have:

1. A specific practice / lab combo on deck to integrate against
2. Timeline / commercial commitment
3. Security review complete

Then we split this ticket into the work items above, each as a proper story.
