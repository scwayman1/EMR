// Wizard step contract for the Practice Onboarding Controller.
//
// The wizard *chrome* (progress rail, step pane, autosave) is owned by EMR-419.
// Individual step bodies are owned by other tickets (EMR-420/421/422/...).
// Each step ships a `WizardStepDefinition` and registers itself in
// `wizard-steps.ts`.  The shell renders whatever step component is registered
// and never reaches into step internals.
//
// IMPORTANT: this contract is specialty-agnostic. Steps must not branch on
// `specialty === 'cannabis'` — the wizard chrome supports any specialty.

import type * as React from "react";

// ---------------------------------------------------------------------------
// Draft configuration shape
//
// EMR-409 owns the canonical `PracticeConfiguration` type. Until that lands we
// declare a structural placeholder so the wizard can compile and the shell
// has a stable type to reduce against. Once EMR-409 ships, replace the local
// declaration below with a re-export from `@/lib/practice-config/types`.
// ---------------------------------------------------------------------------

export type { PracticeConfiguration } from "@/lib/practice-config/types";
import type { PracticeConfiguration } from "@/lib/practice-config/types";

// ---------------------------------------------------------------------------
// Step contract
// ---------------------------------------------------------------------------

export type WizardStepId = string;

export type WizardStepProps = {
  /** Current draft snapshot. Steps should treat this as read-only. */
  draft: Partial<PracticeConfiguration>;
  /**
   * Apply a partial update to the draft. The shell merges, persists locally,
   * and schedules a debounced PATCH to `/api/configs/[id]`.
   */
  patch: (changes: Partial<PracticeConfiguration>) => void;
  /** Advance to the next reachable step. No-op on the last step. */
  goNext: () => void;
  /** Return to the previous step. No-op on the first step. */
  goBack: () => void;
  /** True when this step is at index 0. */
  isFirst: boolean;
  /** True when this step is at the final index. */
  isLast: boolean;
};

export type WizardStepDefinition = {
  /** Stable identifier — used in URLs, persistence, and the registry. */
  id: WizardStepId;
  /** Human-readable title for the rail and pane header. */
  title: string;
  /** Optional shorter label for the progress rail. */
  shortTitle?: string;
  /** Optional pane subhead under the title. */
  description?: string;
  /**
   * Whether this step has all required data. Pure function of the draft.
   * Used to gate the Next button and to mark rail items as "completed".
   */
  isComplete: (draft: Partial<PracticeConfiguration>) => boolean;
  /**
   * Whether this step is reachable yet — typically a function of which
   * earlier steps are complete. Unreachable steps render as `disabled` in
   * the rail and cannot be navigated to.
   */
  isReachable: (
    draft: Partial<PracticeConfiguration>,
    completedSteps: Set<WizardStepId>,
  ) => boolean;
  /**
   * Whether the user may skip this step even when incomplete. The shell
   * uses this to enable the Next button on placeholder steps.
   */
  canSkip?: boolean;
  /** The step body. Receives the draft and a `patch` mutator. */
  Component: React.ComponentType<WizardStepProps>;
};

// ---------------------------------------------------------------------------
// Rail item state
// ---------------------------------------------------------------------------

export type RailItemStatus = "completed" | "current" | "available" | "disabled";

export type RailItem = {
  id: WizardStepId;
  index: number;
  title: string;
  status: RailItemStatus;
};

// ---------------------------------------------------------------------------
// Save indicator
// ---------------------------------------------------------------------------

export type SaveStatus = "idle" | "saving" | "saved" | "error";
