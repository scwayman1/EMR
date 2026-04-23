# MALLIK-004 — Leaflet (After Visit Summary) print view truncates content

- **Reporter:** User (QA on live prod, 2026-04-17)
- **Owner:** Mallik
- **Status:** ready
- **Priority:** P2 (visible to patients; breaks the "take-home summary" promise)

## Problem

The Leafjourney After Visit Summary ("Leaflet") renders clinical content in constrained / fixed-height fields that truncate text visually instead of flowing it onto the page. On screen you can't scroll inside them; on print they're cut off at the box boundary and the rest of the content is lost.

Observed on James Chen's AVS, 2026-04-17:

- **What We Discussed** — final sentence partially visible, textarea crops further lines
- **Your Care Plan** — truncated mid-item around item 3: `"3. ...cannabis cannabis..."` is cut off at the bottom edge of the field
- **Your Visit Story** — ends mid-sentence: `"We're also happy to talk with your wife"` — remainder of the paragraph is not visible

This means patients take home an incomplete summary of their visit.

## Root cause hypothesis (for eng)

The Leaflet view is reusing the same `<textarea>` / bounded-div components the clinician uses for editing, rather than rendering the content as flowing prose. `<textarea>` has an intrinsic height and `overflow-y: hidden` behavior — perfect for editing, wrong for printing.

## Scope

**In scope**

- Identify the Leaflet render component (probably under `src/app/(clinician)/clinic/patients/[id]/leaflet/` or a shared AVS component) and replace the bounded input fields with flowing `<p>` / `<div>` text blocks on the print / patient-facing render path.
- Ensure `@media print` styles let content paginate naturally (no `overflow: hidden`, no fixed heights, `break-inside: avoid` on section headers only).
- Preserve the editable clinician view unchanged — this is purely a presentation-layer fix for the finalized/printed Leaflet.

**Out of scope**

- Restyling the Leaflet
- Multi-page pagination logic (browser print handles it once the overflow constraints are gone)

## Acceptance criteria

- [ ] On the `/clinic/patients/[id]/leaflet` view (patient-facing / print), every section's content is fully visible — no inner scrollbars, no bottom-edge truncation
- [ ] Browser `Cmd/Ctrl+P` prints all content across as many pages as it takes; nothing is cut off
- [ ] The clinician's editable chart / note view is unchanged

## Test case (use this James Chen payload)

Render the leaflet with the existing James Chen demo data — all four sections below must display in full:

- What We Discussed: `"cardiac workup and clearance from cardiology. Differential diagnoses considered include: Adjustment Disorder with Anxiety, Generalized Anxiety Disorder, and secondary insomnia related to pain and/or anxiety."`
- Your Care Plan: multi-item list through item 4+
- What to Do Next: bullet list
- Your Visit Story: full paragraph including the line about the patient's wife

## References

- Screenshot from 2026-04-17 prod (James Chen AVS on `leafjourney.com`)
- Likely component: `src/app/(clinician)/clinic/patients/[id]/leaflet/` (need to confirm — may be under `/print` or a shared `AVS` component)
