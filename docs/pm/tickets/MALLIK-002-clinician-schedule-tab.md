# MALLIK-002 — Clinician Portal: Schedule tab with full-page calendar

- **Reporter:** Dr. Patel
- **Owner:** Mallik
- **Status:** needs-info (right-click menu spec was cut off mid-sentence)
- **Priority:** P1 (requested by clinician lead)

## User story

As a clinician, I want a "Schedule" tab in my main nav that opens a full-page calendar, so I can see my visit load at a glance and jump into any patient's chart directly from the calendar instead of hunting through the roster.

## Scope

**In scope**

- Add "Schedule" as a top-level tab in the clinician portal main column / nav (`src/app/(clinician)/layout.tsx` nav array, landing at a new route like `/clinic/schedule`)
- Opens to a full-page calendar defaulting to the **current month**
- Reuse the existing calendar component from the operator / "owner" portal (see open question on which portal Dr. Patel meant)
- View selector dropdown with options: **Day / Week / Month / Year**
- Left-click on a patient on the calendar → navigates to that patient's chart (`/clinic/patients/[id]`)
- Right-click on a patient's scheduled appointment → context menu **[spec cut off, pending Dr. Patel]**

**Out of scope**

- Creating new appointments from the calendar (TBD — see open question)
- Multi-provider overlay (TBD — see open question)
- Schedule syncing with external calendars (Google / Outlook / Apple)

## Acceptance criteria

- [ ] "Schedule" nav item present in the clinician portal main nav, between "Roster" and "Inbox" (tentative placement — designer to confirm)
- [ ] Full-page `/clinic/schedule` route renders the current month by default
- [ ] View selector dropdown works for Day / Week / Month / Year; state persists within the session (URL param preferred)
- [ ] Left-click on any patient-bearing event navigates to that patient's chart
- [ ] Right-click on an appointment shows a context menu with the actions defined in the pending Dr. Patel spec
- [ ] Visual format matches the owner / operator portal calendar (same component or tight visual parity)

## Open questions — blocking handoff to engineering

1. **Right-click menu contents.** Dr. Patel's message cut off at _"right click on either the patient's scheduled..."_. What actions should the menu expose? (Reschedule / Cancel / Message patient / Add note / Mark no-show / View chart / etc.?) And what does "either" refer to — appointment vs. something else?
2. **"Owner portal" disambiguation.** The code has `(operator)` (ops Mission Control) and `(clinician)` (clinic) route groups, but no "owner" portal. Did Dr. Patel mean the operator calendar, or a different one? Engineering needs to know which component to reuse.
3. **Default anchoring.** On Week / Day views, does the calendar default to today? Month defaults to the current month, but it's unclear what happens when a provider switches views.
4. **Multi-provider view.** Solo clinician view only, or should a provider be able to toggle to see other providers' schedules too?
5. **Create appointment from empty slot.** Click an empty time slot to create a new appointment, or is the calendar read-only for V1?

## References

- Dr. Patel Linear request (cut off mid-sentence on right-click menu)
- Existing "Today's schedule" card on `src/app/(clinician)/clinic/page.tsx` lines 58–112 (inline list, not a calendar — will need to be distinguished from the new full-page calendar)
