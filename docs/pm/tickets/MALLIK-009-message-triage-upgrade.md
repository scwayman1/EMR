# MALLIK-009 — Message Triage upgrade on /clinic/messages

- **Parent:** MALLIK-005 (Mission Control epic)
- **Reporter:** Dr. Patel
- **Owner:** Mallik
- **Status:** ready-to-build
- **Priority:** P1

## User story

As a physician, I want my message inbox to feel like a triage queue — with AI-suggested action labels (call / prescribe / review / delegate / routine) and urgency cues — so I can cut through a day's worth of messages instead of reading them all linearly.

## Why now

Dr. Patel:

> Messages should be like a little bit bigger of a box, since that, it should be like an email kind of like outlay. You can just say like, hey, message from this patient, call at this time, so it'd be like a name, it would be the time, and it can say with AI, it could say call, prescribe, ignoreable, like something else, right? Less intense. Call, prescribe, all that.

The current `/clinic/messages` already exists. This is an **upgrade**, not a new page.

## Scope

### In scope — Phase 1

**1. AI-triaged inbox row**

On `/clinic/messages`, each row gets:

- AI **action label** chip: `call` / `prescribe` / `review` / `delegate` / `routine` / `urgent` / `informational`
- **Urgency** chip: `high` / `normal` / `low` — color coded, drives sort order
- Existing: sender, time, preview, unread indicator

Action-label labels are determined by the existing `messagingAssistant` agent — we extend its output schema to include `actionLabel` and `urgency` alongside whatever it already produces.

**2. Quick-action buttons per row**

Right-rail actions on each row (hover / keyboard-focus reveal):

- **Reply** — opens compose drawer pre-filled with the suggested draft
- **Call** — marks as "call queued" and opens a call-note overlay
- **Convert to refill** — if the message is a refill request, creates a `RefillRequest` (MALLIK-007) linked to the message
- **Convert to task** — routes to MA or to the physician's own task list with a one-liner
- **Assign to MA** — delegates, auto-adds the triage context to the MA's task

**3. Sort and filter**

- Sort: urgent first, then by AI label priority (call > prescribe > review > routine), then by time
- Filter chips at top: `unread` / `urgent` / `refills` / `by me` / `to MA`

**4. Keyboard shortcuts**

- `j` / `k` — next / previous message
- `r` — reply drawer
- `c` — call
- `d` — delegate to MA
- `e` — archive

### Out of scope — Phase 1

- Auto-reply without physician review — never in V1 (safety)
- SMS / text-patient-back from the inbox — Phase 3 with the outreach epic
- Voice-in-physician-voice replies — Phase 3

## Data model additions

Extend existing `Message` model:

```prisma
model Message {
  // ... existing fields ...
  aiActionLabel String?   // "call" | "prescribe" | "review" | "delegate" | "routine" | "urgent" | "informational"
  aiUrgency     String?   // "high" | "normal" | "low"
  aiDraft       String?   // pre-filled reply suggestion (already partially present)
  triagedAt     DateTime?
  @@index([organizationId, aiUrgency])
}
```

## Acceptance criteria

- [ ] Every message in the demo fixtures has an `aiActionLabel` + `aiUrgency` after the messagingAssistant agent runs on ingest
- [ ] Inbox renders chips on each row; chip color matches urgency / label
- [ ] Quick-action buttons work: reply opens drawer; call opens note overlay; convert-to-refill creates a linked RefillRequest
- [ ] Sort defaults to urgent-first; filter chips work
- [ ] Keyboard shortcuts work (`j` `k` `r` `c` `d` `e`)
- [ ] "Convert to refill" creates a proper `RefillRequest` and marks the message `handled`

## Open questions

1. Does messagingAssistant already produce action labels? If yes, this is a schema + UI ticket. If no, add the classifier step to the agent.
2. Do we snooze messages? (Not in Dr. Patel's interview, but common inbox feature.) **Recommend:** add in Phase 2 if requested — skip for Phase 1.
