# MALLIK-013 — Mission Control dashboard: drag / resize / reorder modules (Phase 1.5 polish)

- **Parent:** MALLIK-005 (Mission Control epic)
- **Reporter:** Dr. Patel (wireframe annotation: *"every window adjustable size/length, can move around home screen but locks onto grid"*)
- **Owner:** Mallik
- **Status:** reserved (Phase 1.5 — picks up immediately after MALLIK-010 lands)
- **Priority:** P2

## Problem

Dr. Patel explicitly asked for a draggable, resizable dashboard that snaps to a grid. MALLIK-010 ships a static grid to avoid blocking the pain-relief payload (Lab + Refill + Document modules). This ticket delivers the grid manipulation layer on top of that static layout.

## Scope

- Drag any module to a new grid cell; cells snap on release
- Resize modules (N/S/E/W handles) in grid-cell increments
- Reorder module stacking
- Per-user persistence (save layout to `UserPreferences` table, scoped per org)
- "Reset to default" button
- Responsive: on viewports <1024px, drag/resize disabled (stacked layout only)

## Technical approach

- Library: evaluate `react-grid-layout` (battle-tested, MIT licensed, grid-native) vs. hand-rolling with CSS Grid + `react-dnd`. **Recommend:** `react-grid-layout` unless the bundle cost is unacceptable (~40KB minified gzipped)
- Layout shape persisted as JSON in a new `DashboardLayout` table keyed on `(userId, organizationId)`
- Module component contract: each module must expose `minW`, `minH`, `defaultW`, `defaultH` props so the grid can constrain sizing

## Acceptance criteria

- [ ] User can drag any module to a new grid position; saves on release
- [ ] User can resize any module; respects minW/minH constraints
- [ ] Layout persists across page reloads + sessions
- [ ] "Reset to default" restores the Phase 1 static layout
- [ ] Dashboard remains usable at <1024px (stacked layout, no drag/resize)
- [ ] Keyboard-accessible alternative: "Move module" menu on each module header (up / down / left / right) for users who can't drag

## Open questions

1. Per-user layouts only, or per-role defaults too? (e.g. new clinicians inherit Dr. Patel's layout until they customize.)
2. Module visibility toggle (hide / show) — in scope here or a separate ticket?
