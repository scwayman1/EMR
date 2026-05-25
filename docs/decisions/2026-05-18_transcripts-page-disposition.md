# /clinic/communications/transcripts — Disposition Decision

**Date:** 2026-05-18
**Ticket:** EMR-693
**Decision:** KEEP, with scoped follow-ups.
**Owner:** Communications surface

## What the page does today

`/clinic/communications/transcripts` (`src/app/(clinician)/clinic/
communications/transcripts/page.tsx`) is the human-in-the-loop review queue
for AI-generated call summaries. After every voice call (Beam telehealth,
inbound voicemail, or outbound clinical call), the transcription pipeline
emits a redacted clinical summary plus structured "clinical bullets" and
parks them in `CallTranscript` rows with `status = pending_review`. The page
splits the screen between (a) a pending queue where clinicians read the
pertinent summary, see which PHI/PII categories were stripped, and either
approve (which attaches the summary to the patient chart) or reject (which
drops it on the floor), and (b) the last 12 reviewer decisions for an
auditable rear-view. Acceptance gating happens via `TranscriptReviewForm`,
which posts the approval/rejection plus an optional reviewer note.

## Clinical use case it serves

This is the legal and clinical chokepoint that lets us claim "AI captures
only pertinent clinical info" without lying. Beam, voicemail, and broadcasts
all generate AI artifacts; none of them write to the chart unless a human
has eyes on the redacted summary first. That is the difference between
"clinical decision support" and "automated chart contamination." Removing
this surface would either (a) force every call summary onto the chart
unreviewed — a HIPAA and malpractice landmine — or (b) leave summaries
orphaned with no review path, undermining the value of running the
transcription pipeline at all. The sibling pages (voicemail, beam,
broadcasts) all produce work that funnels here; this page is the
sink, not a duplicate.

## What needs to change to pull its weight

- **Promote into the Communications overlay header.** Today it's only
  reachable as a side-channel via the metric tile; pending counts should
  surface as a badge on the global header so clinicians don't have to
  remember to visit.
- **Bulk-approve for low-signal summaries.** A clinician seeing 12 routine
  med-refill summaries shouldn't click 12 times. Add a "select all
  routine-severity" path with a single audit-logged approval.
- **Attach to encounter, not just patient.** Approved summaries currently
  land on the patient chart globally; routing them to the originating
  encounter (when one exists) makes them discoverable inside the visit
  note rather than buried in chart history.

Keep the page. Track the three follow-ups as separate phase-13 tickets.
