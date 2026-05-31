# AI Visit Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the physician-facing AI Visit Completion strip below finalized notes with deterministic Suggested Next Best Actions.

**Architecture:** Build a pure `visit-completion` domain projection that turns note blocks, coding suggestions, and follow-up context into a typed bundle. Include learning-loop metadata that maps physician actions to the existing `AgentFeedback` spine, then render the bundle in a focused note-route panel component and wire the note detail page to build it only for finalized notes.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Prisma query data, Vitest node tests, existing `Card`, `Badge`, and `Button` UI primitives.

---

## File Structure

- Create `src/lib/domain/visit-completion.ts`: pure types and deterministic bundle builder.
- Create `src/lib/domain/visit-completion.test.ts`: unit tests for stable cards, follow-up warning, coding degradation, and summary counts.
- Create `src/app/(clinician)/clinic/patients/[id]/notes/[noteId]/visit-completion-panel.tsx`: server-renderable panel component for the approved UI.
- Create `src/app/(clinician)/clinic/patients/[id]/notes/[noteId]/visit-completion-panel.test.tsx`: node-safe React element inspection test that locks key product language.
- Modify `src/app/(clinician)/clinic/patients/[id]/notes/[noteId]/page.tsx`: query future appointment context, build bundle for finalized notes, render panel below `NoteEditor`.

## Task 1: Domain Bundle Builder

**Files:**
- Create: `src/lib/domain/visit-completion.ts`
- Create: `src/lib/domain/visit-completion.test.ts`

- [ ] **Step 1: Write failing domain tests**

Add tests that import `buildVisitCompletionBundle` and expect:

```ts
expect(bundle.cards.map((card) => card.id)).toEqual([
  "orders",
  "follow_up",
  "patient_message",
  "practice_readiness",
]);
expect(bundle.primaryActionLabel).toBe("Release Care Plan");
expect(bundle.learningLoop.agentName).toBe("visitCompletion");
expect(bundle.learningLoop.signals).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ actionId: "release_care_plan", feedbackAction: "approved" }),
    expect.objectContaining({ actionId: "edit_item", feedbackAction: "approved_with_edits" }),
    expect.objectContaining({ actionId: "remove_item", feedbackAction: "rejected" }),
    expect.objectContaining({ actionId: "defer_item", feedbackAction: "dismissed" }),
  ]),
);
expect(bundle.cards.find((card) => card.id === "follow_up")?.items[0]).toMatchObject({
  tone: "alert",
  label: "Plan implies follow-up; no appointment scheduled",
});
expect(bundle.cards.find((card) => card.id === "practice_readiness")?.items).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ label: "Suggested E/M: 99214" }),
    expect.objectContaining({ label: "ICD-10 candidate: E11.9 Diabetes mellitus" }),
  ]),
);
```

- [ ] **Step 2: Run red test**

Run: `npm test -- src/lib/domain/visit-completion.test.ts`

Expected: fail because `src/lib/domain/visit-completion.ts` does not exist.

- [ ] **Step 3: Implement minimal builder**

Create types:

```ts
export type VisitCompletionCardId = "orders" | "follow_up" | "patient_message" | "practice_readiness";
export type VisitCompletionTone = "neutral" | "warning" | "alert";
export type VisitCompletionSource = "note" | "coding" | "problem_list" | "encounter" | "heuristic";

export interface VisitCompletionItem {
  id: string;
  label: string;
  tone: VisitCompletionTone;
  source: VisitCompletionSource;
  reason?: string;
}

export interface VisitCompletionAction {
  id: string;
  label: string;
  variant: "primary" | "secondary";
}

export interface VisitCompletionCard {
  id: VisitCompletionCardId;
  title: string;
  subtitle: string;
  items: VisitCompletionItem[];
  actions: VisitCompletionAction[];
}

export interface VisitCompletionBundle {
  sectionLabel: "AI Visit Completion";
  heading: "Suggested Next Best Actions";
  primaryActionLabel: "Release Care Plan";
  supportActionLabel: "Approve all suggested actions";
  summary: string;
  releaseEnabled: boolean;
  learningLoop: VisitCompletionLearningLoop;
  cards: VisitCompletionCard[];
}

export interface VisitCompletionLearningLoop {
  agentName: "visitCompletion";
  agentVersion: "1.0.0";
  signals: VisitCompletionLearningSignal[];
}

export interface VisitCompletionLearningSignal {
  actionId: "release_care_plan" | "approve_all" | "edit_item" | "remove_item" | "defer_item";
  feedbackAction: "approved" | "approved_with_edits" | "rejected" | "dismissed";
  meaning: string;
}
```

Implement `buildVisitCompletionBundle(input)` with deterministic heuristics:

- always returns the four cards in stable order
- flags follow-up language when no future appointment exists
- uses `codingSuggestion.emLevel` and ICD-10 labels when present
- degrades Practice Readiness to `No coding suggestion yet` when absent
- computes summary from card items
- includes learning-loop metadata that can be persisted through `src/lib/agents/memory/agent-feedback.ts`

- [ ] **Step 4: Run green domain test**

Run: `npm test -- src/lib/domain/visit-completion.test.ts`

Expected: pass.

## Task 2: AI Visit Completion Panel

**Files:**
- Create: `src/app/(clinician)/clinic/patients/[id]/notes/[noteId]/visit-completion-panel.tsx`
- Create: `src/app/(clinician)/clinic/patients/[id]/notes/[noteId]/visit-completion-panel.test.tsx`

- [ ] **Step 1: Write failing panel test**

Render the component as a React element in node and inspect it with `util.inspect`, following `src/components/ui/button.test.tsx`.

Assert the tree contains:

```ts
expect(str).toContain("AI Visit Completion");
expect(str).toContain("Suggested Next Best Actions");
expect(str).toContain("Release Care Plan");
expect(str).toContain("Suggested Orders");
expect(str).toContain("Follow-Up Plan");
expect(str).toContain("Patient Communication");
expect(str).toContain("Practice Readiness");
expect(str).toContain("Physician remains in control.");
expect(str).toContain("Learns from approvals, edits, removals, and deferrals.");
```

- [ ] **Step 2: Run red panel test**

Run: `npm test -- "src/app/(clinician)/clinic/patients/[id]/notes/[noteId]/visit-completion-panel.test.tsx"`

Expected: fail because the panel file does not exist.

- [ ] **Step 3: Implement panel component**

Create `VisitCompletionPanel({ bundle })` that:

- uses `Card`, `CardContent`, `Badge`, and `Button`
- renders the approved language
- maps card item tones to compact colored dots
- renders actions as small buttons
- renders **Release Care Plan** as the primary button
- stacks cards on mobile with `grid-cols-1 lg:grid-cols-4`
- includes the control note: "Physician remains in control."
- includes learning-loop copy that makes the toolchain support visible without making the UI feel like telemetry

- [ ] **Step 4: Run green panel test**

Run: `npm test -- "src/app/(clinician)/clinic/patients/[id]/notes/[noteId]/visit-completion-panel.test.tsx"`

Expected: pass.

## Task 3: Route Integration

**Files:**
- Modify: `src/app/(clinician)/clinic/patients/[id]/notes/[noteId]/page.tsx`

- [ ] **Step 1: Add integration imports and future appointment query**

Import:

```ts
import { buildVisitCompletionBundle } from "@/lib/domain/visit-completion";
import { VisitCompletionPanel } from "./visit-completion-panel";
```

Query one future appointment for the same patient:

```ts
const futureAppointment = await prisma.appointment.findFirst({
  where: {
    patientId: params.id,
    startAt: { gt: new Date() },
    status: { notIn: ["cancelled", "no_show"] },
  },
  select: { id: true },
});
```

- [ ] **Step 2: Build the bundle only for finalized notes**

After `codingSuggestion` parsing:

```ts
const visitCompletionBundle =
  note.status === "finalized"
    ? buildVisitCompletionBundle({
        patientFirstName: patient.firstName,
        blocks,
        codingSuggestion,
        hasFutureAppointment: Boolean(futureAppointment),
      })
    : null;
```

- [ ] **Step 3: Render panel below `NoteEditor`**

Add:

```tsx
{visitCompletionBundle && (
  <VisitCompletionPanel bundle={visitCompletionBundle} />
)}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/lib/domain/visit-completion.test.ts "src/app/(clinician)/clinic/patients/[id]/notes/[noteId]/visit-completion-panel.test.tsx"
```

Expected: pass.

## Task 4: Verification

**Files:**
- No new files.

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 2: Inspect final diff**

Run: `git diff --stat && git diff -- src/lib/domain/visit-completion.ts src/app/'(clinician)'/clinic/patients/'[id]'/notes/'[noteId]'/visit-completion-panel.tsx src/app/'(clinician)'/clinic/patients/'[id]'/notes/'[noteId]'/page.tsx`

Expected: diff is limited to the planned files and approved UI language.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add src/lib/domain/visit-completion.ts src/lib/domain/visit-completion.test.ts src/app/'(clinician)'/clinic/patients/'[id]'/notes/'[noteId]'/visit-completion-panel.tsx src/app/'(clinician)'/clinic/patients/'[id]'/notes/'[noteId]'/visit-completion-panel.test.tsx src/app/'(clinician)'/clinic/patients/'[id]'/notes/'[noteId]'/page.tsx docs/superpowers/plans/2026-05-30-ai-visit-completion.md
git commit -m "feat: add ai visit completion panel"
```

Expected: commit succeeds.

## Plan Self-Review

- Spec coverage: the plan covers the typed bundle, the four cards, route rendering, approved language, first-slice no-live-model behavior, learning-loop metadata, and tests.
- Scoped deferral: release persistence, task creation, patient-message sending, billing workflow dispatch, and actual feedback writes are intentionally deferred behind the same bundle contract and existing `AgentFeedback` primitive.
- Placeholder scan: no placeholders or undefined task references remain.
