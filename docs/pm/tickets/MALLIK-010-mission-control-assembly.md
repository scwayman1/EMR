# MALLIK-010 — Mission Control dashboard assembly on /clinic

- **Parent:** MALLIK-005 (Mission Control epic)
- **Reporter:** Dr. Patel
- **Owner:** Mallik
- **Status:** ready-to-build (depends on MALLIK-006 and MALLIK-007 landing first — this composes them)
- **Priority:** P0 (this is the moment the user sees the vision)

## User story

As a physician, when I open the EMR I want to land on a dashboard that shows me my day at a glance — schedule, refills waiting, labs to sign, documents to review, messages to triage — with every module actionable in one or two clicks, so I can tell in 3 seconds what my morning looks like.

## Scope

### In scope — Phase 1

**1. Evolve `/clinic` into Mission Control** (per user's decision #4)

Replace the current home page (today-visits + recent-patients layout) with a **static grid** of modules arranged per Dr. Patel's wireframe. Use a simple CSS grid or Tailwind grid utilities — **no drag-resize** in Phase 1 (→ MALLIK-013).

**2. Grid layout** (desktop-first, per user's decision #5)

Approximate layout at ≥1280px viewport:

```
┌────────────────┬──────────────────────┬──────────────────────┐
│ Today widget   │ Mindful Module       │ Messages (tall)      │
│ (time/wx/date) │ (breathing/quote/    │                      │
│                │  sound, 30-min       │  AI-labeled rows     │
│                │  rotation)           │  quick actions       │
├────────────────┤                      │  filter chips        │
│ Schedule       ├──────────────────────┤                      │
│ (scrollable)   │ Search bar           │                      │
│ day toggle     │ (records + GPT)      │                      │
│                │                      │                      │
├────────────────┴──────────────────────┼──────────────────────┤
│ Refill Queue                          │ Sign-Off tray        │
│ (MALLIK-007 module in compact mode)   │ (cross-module)       │
│                                       │                      │
├───────────────────────────────────────┤                      │
│ Lab Review Queue                      │ Rx (compact refill   │
│ (MALLIK-006 module in compact mode)   │  sign list)          │
│                                       │                      │
├───────────────────────────────────────┴──────────────────────┤
│ Document Review Queue                                        │
│ (MALLIK-008 module in compact mode)                          │
└──────────────────────────────────────────────────────────────┘
```

At <1024px viewport, stack vertically. Tablet / phone layouts are out-of-scope for Phase 1.

**3. Compact mode for each module**

Every queue module (006 / 007 / 008) exposes a "compact" variant that:

- Shows top N rows (N=5 by default, configurable)
- Has a "View all →" link to the standalone page
- Shows a total-pending badge in the header
- No sort/filter chips in compact mode (only on the full page)
- All row actions still work (checkbox, approve, open overlay)

The compact variant and full-page variant **share the same row component** — DRY.

**4. Shared Sign-Off tray**

A single bottom-of-screen tray that aggregates checked items across Lab Review + Refill Queue + Document Review. One "Sign & Send All" button covers everything in the tray. Items from different queues sign independently but under the same re-auth event.

Per Dr. Patel's wireframe, this is the card labeled "Sign Off" with multi-type checkboxes (CT Scan, Labs, Path report, PT/OT).

**5. Mindful Module** (existing `BreathingBreak` component, promoted)

- Cycles every 30 minutes between: breathing prompt / illustrated quote / ambient sound
- Dismissible; can be hidden via user preference
- Non-blocking — never interrupts an active workflow

**6. Today widget**

Small card at top-left: current time (live clock), weather for clinic's configured city (stub — use a free weather API, or if none, fall back to static seasonal text), date, day-of-week.

Phase 1: weather-free (just time + date). Weather is a nice-to-have that shouldn't block.

**7. Search bar (elevated)**

- New dashboard-level search input (distinct from Cmd+K palette which stays)
- Scope: all records (patients, docs, messages, labs) + GPT-style natural-language answers from our existing model client
- Results render in a dropdown below the input; click → navigate

### Out of scope — Phase 1 (backlog)

- **Drag / resize / reorder** → MALLIK-013
- Weather API integration — stretch goal if easy (OpenWeather free tier), otherwise defer
- Mobile / tablet responsive → not Phase 1
- Population-intelligence / trends panel → Phase 3 per PRD
- Right-click context menus on schedule / rx (Dr. Patel mentioned) — nice-to-have, not blocking

## Technical notes

- The current `/clinic/page.tsx` is a Server Component doing Prisma queries inline for today's encounters + counts. Refactor to:
  - Each module owns its own data fetch (via a server component helper)
  - Dashboard page composes modules, not queries
  - This keeps MALLIK-010 a thin composition ticket while MALLIK-006/007/008 own their own data shape
- Use React Suspense per module so the dashboard paints progressively (modules with fast queries don't wait on slow ones)

## Acceptance criteria

- [ ] `/clinic` renders the grid layout with all six modules present
- [ ] Each module is fully functional in compact mode (not stubs)
- [ ] "View all →" links work from every module header
- [ ] Shared Sign-Off tray aggregates checked items across Lab + Refill + Document queues
- [ ] One `AuditLog` row per signed item, regardless of origin queue
- [ ] Mindful Module rotates every 30 minutes; dismissible; doesn't interrupt other work
- [ ] Dashboard paints in <1s on desktop (Suspense boundaries per module)
- [ ] No drag-resize expected — static grid is correct for Phase 1

## Open questions

1. "Scannable in 3 seconds" — what's the single most important metric on first-paint? **Propose:** urgent items (unsigned abnormal labs, high-urgency messages, flagged refills) have a red dot in the header of their module.
2. How much of the current `/clinic` layout do we preserve vs. fully replace? **Propose:** fully replace — this is a re-launch of the physician home screen. Old today-visits content subsumed by the new Schedule module.
