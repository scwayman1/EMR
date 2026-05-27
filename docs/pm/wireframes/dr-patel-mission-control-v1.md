# Wireframe — Dr. Patel's Provider Front Page (v1, hand-drawn)

Hand-drawn wireframe by Dr. Patel dated 2026-04-17. The image is the source of truth; this file transcribes it so we don't lose the structure if the image moves.

Top annotation: **"Provider page (Front page)"**

## Header

Rounded pill-shape greeting bar, full width:

> 🌿 **Welcome back, Dr. Patel!** 🌿

Annotation: *cannabis leaf* icons at the ends.

## Modules (numbered in red by Dr. Patel)

### 1. Time / Weather / Date

Small square card. Contains:

- Time
- Weather
- Date

### 2. Schedule

Medium card, scrollable (vertical scrollbar drawn on the right edge, labeled "scroll bar"):

- 8:00 AM — Mr. Jo Smith
- 8:30 AM — Mrs. Jean Smith
- 9:30 AM — God
- 11:30 AM — Lunch Meeting (Scott Wayman)

### 3. Mindful Module

Medium wide card at the top center. Note reads:

> have this change every **30 min** [breathing, picture, quote, nice sounds]

### 4. Search Bar

Medium card in the middle of the layout. Note reads:

> Dox GPT / Gemini + ability to search **all** records (partial words, full words)

Annotated label: *Medical info*

### 5. Messages

Medium tall card, top right, scrollable (scrollbar on the right edge):

- 8:05 AM — Mr. Joe Smoe — "call", "refill"
- 9:05 AM — Mrs. Jean — asking about...
- [NEW] — →?

### 6. Sign Off

Small card, bottom middle-right. Checklist style:

- [x] CT Scan
- [x] Labs
- [x] Path report
- [ ] PT/OT

With two action buttons drawn at the bottom: **"Sign Off"** and **"Upload"**. Scroll indicator on the right.

### 7. Rx

Small card, far bottom-right. Prescription queue:

- Mr. Joe — [ibuprofen] ✓
- Mrs. Jean — [Xanax] ✓
- God — [Love] ✓

With action button at the bottom: **"Sign Off"**. Scroll indicator on the right.

## Layout annotations (in red)

> every window adjustable size/length, can move around home screen but locks onto grid

That is explicit: Dr. Patel wants a **draggable, resizable dashboard that snaps to a grid**. Not a fixed layout.

## Interpretation notes (Mallik)

- The wireframe is conceptual, not pixel-accurate. The module list matches the interview beats (calendar, refills, labs, imaging/docs, messages) plus two Dr. Patel didn't mention verbally: **Time/Weather/Date widget** (#1) and **Mindful Module** (#3).
- The **Sign Off (#6)** card on the wireframe combines labs + imaging + path + PT into one multi-doc sign-off tray. That's stronger than what the interview suggested (separate modules). Open question: does Dr. Patel want labs+imaging as one combined queue, or as separate modules with a shared sign-off tray? → Flag for review before finalizing MALLIK-008 scope.
- **Search bar (#4)** centered in the dashboard is distinct from the current `CommandPalette` (Cmd+K). It's positioned as a permanent surface, not a keyboard trigger. Interesting UX choice — likely worth keeping both.
- **Mindful Module (#3)** maps cleanly onto the existing `BreathingBreak` component. We just need to promote it from a global timer to a first-class dashboard module.
- The **"God" / "Love"** entries in the Schedule and Rx cards are Dr. Patel testing his sense of humor in the mockup. Not real patients.
