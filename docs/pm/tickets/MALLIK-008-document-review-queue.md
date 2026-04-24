# MALLIK-008 — Document Review Queue (imaging, sleep studies, PT notes, prior auths)

- **Parent:** MALLIK-005 (Mission Control epic)
- **Reporter:** Dr. Patel
- **Owner:** Mallik
- **Status:** ready-to-build (depends on MALLIK-006 landing first — shares the pattern)
- **Priority:** P1

## User story

As a physician, I want a single review queue for non-lab documents — imaging, sleep studies, colonoscopies, PT notes, prior auths — that works exactly like the lab review queue (compact rows, overlay detail, batch sign-off), so my clerical review work has one muscle-memory pattern regardless of document type.

## Why now

Dr. Patel in the interview:

> Document review is where I have basically labs that need to be signed off on, images that need to be reviewed and signed off on, sleep studies, colonoscopies, prior authorizations, physical therapy notes, you name it. So everything that I need to sign off on goes through the document review.

Labs are their own ticket (MALLIK-006) because the auto-compare pattern is unique. Everything else shares one queue.

## Scope — delta from MALLIK-006

Most of this ticket reuses the Lab Review pattern. Only the deltas are listed here.

### New — document-type-aware row

Each row shows: patient (first name + last initial), **document type icon** (imaging / sleep / colonoscopy / PT / prior-auth / other), document title, received date, source (facility / specialist name), abnormal-flag indicator, checkbox for batch.

### New — document-type-aware overlay

Overlay content varies by document type:

- **Imaging / radiology report** — key findings, impression section, radiologist signature, report body rendered with monospace
- **Sleep study** — AHI, oxygen nadir, sleep efficiency, provider's conclusion
- **Colonoscopy** — findings, pathology results if linked, recommended follow-up interval
- **PT notes** — session count, progress summary, recommendation
- **Prior auth** — approval/denial status, reason, next action
- **Other** — generic PDF preview + text extraction if available

### New — AI summary per overlay

The existing `documentOrganizer` agent already classifies + tags incoming docs. Extend it (or wrap it) to add a **1–3 sentence AI summary** on the overlay — Dr. Patel asked for this for labs; it applies here too. No re-generation on view (precompute on ingest).

### Shared with MALLIK-006

- Queue UI (compact rows, sort, filter by "all / abnormal / unsigned")
- Overlay close behavior, keyboard nav
- Batch sign tray + atomic-per-item signing + `AuditLog`
- Abnormal / flagged docs **cannot** be added to the batch lane

### Out of scope

- Real document ingestion feeds (DICOM, HL7, fax intake) — Phase 2+ integration work
- OCR pipeline for handwritten docs — Phase 3 (Dr. Patel asked for it; deferred per the PRD phasing)
- Auto-routing to specialty follow-up — Phase 2

## Data model additions

Extend the existing `Document` model with:

```prisma
model Document {
  // ... existing fields ...
  signedById    String?
  signedAt      DateTime?
  aiSummary     String?    // set by documentOrganizer on ingest
  abnormalFlag  Boolean   @default(false)
  reviewOutcome String?    // "normal" | "needs_follow_up" | "repeat" | "routed_to_ma"
  @@index([organizationId, signedAt])
}
```

## Acceptance criteria

- [ ] `/clinic/documents-review` queue renders with seeded fixtures across document types
- [ ] Type icon + type-specific overlay renders for each (imaging, sleep, colonoscopy, PT, prior auth, other)
- [ ] AI summary visible on each overlay (precomputed, not live-generated)
- [ ] Batch sign tray works; abnormal documents excluded from batch
- [ ] One `AuditLog` row per signed document
- [ ] Code reuses the MALLIK-006 queue + overlay primitives (shared component, not a fork)

## Open questions

1. Should imaging overlays show actual DICOM previews in Phase 1, or report-text-only? **Recommend:** report-text-only in Phase 1; DICOM viewer is its own epic.
2. Document ingestion: Phase 1 fixtures only (same call as labs). Real feeds → backlog alongside MALLIK-011.
