// Practice Launch Wizard — structured multi-step state model
//
// A new practice progresses through a fixed, ordered set of launch steps.
// Each step's completion is derived from the organization's observable
// state (counts of providers, payer configs, intake forms, etc.) rather
// than a separate persisted flag. This keeps the wizard's view of "done"
// always in sync with the underlying data.
//
// `getLaunchProgress` turns an `OrgLaunchState` snapshot into a progress
// object the UI can render without any extra queries.

export type LaunchStepId =
  | "org_profile"
  | "clinicians"
  | "payer_config"
  | "intake_forms"
  | "billing_rules"
  | "go_live";

export interface OrgLaunchState {
  /** True once the practice profile (name, address, phone, business hours) is filled out. */
  hasOrgProfile: boolean;
  /** Number of registered clinicians / providers. */
  clinicianCount: number;
  /** Number of configured payers (insurance entries). */
  payerCount: number;
  /** Number of intake form templates the practice has published. */
  intakeFormCount: number;
  /** Number of fee-schedule / billing-rule entries. */
  billingRuleCount: number;
  /** ISO timestamp of when the practice went live, or null if not yet. */
  goLiveAt: Date | null;
}

export interface LaunchStep {
  id: LaunchStepId;
  title: string;
  description: string;
  isComplete(orgState: OrgLaunchState): boolean;
}

/**
 * The fixed, ordered set of practice-launch steps.
 *
 * Order matters: `getLaunchProgress` treats earlier steps as prerequisites
 * for later ones, and the wizard lands on the first incomplete step.
 */
export const LAUNCH_STEPS: readonly LaunchStep[] = [
  {
    id: "org_profile",
    title: "Practice profile",
    description:
      "Name your practice, set the business address, phone, and operating hours.",
    isComplete: (s) => s.hasOrgProfile,
  },
  {
    id: "clinicians",
    title: "Add clinicians",
    description:
      "Register at least one physician or nurse practitioner who will see patients.",
    isComplete: (s) => s.clinicianCount >= 1,
  },
  {
    id: "payer_config",
    title: "Configure payers",
    description:
      "Add the insurance payers you plan to bill, with their EDI identifiers.",
    isComplete: (s) => s.payerCount >= 1,
  },
  {
    id: "intake_forms",
    title: "Publish intake forms",
    description:
      "Review and publish the patient intake form that new visitors will complete.",
    isComplete: (s) => s.intakeFormCount >= 1,
  },
  {
    id: "billing_rules",
    title: "Set billing rules",
    description:
      "Define your fee schedule — CPT codes, office-visit prices, telehealth rates.",
    isComplete: (s) => s.billingRuleCount >= 1,
  },
  {
    id: "go_live",
    title: "Go live",
    description:
      "Flip the switch. Your practice becomes visible to patients and the door opens.",
    isComplete: (s) => s.goLiveAt !== null,
  },
] as const;

export interface LaunchProgress {
  /** Id of the first incomplete step, or null if everything is done. */
  currentStep: LaunchStepId | null;
  /** 0–100 integer percent of completed steps. */
  percentComplete: number;
  /** Short imperative describing what the operator should do next. */
  nextAction: string;
}

/**
 * Summarize the org's launch progress.
 *
 * - `currentStep` is the first step whose `isComplete` returns false.
 * - `percentComplete` is the share of steps already complete, rounded
 *   to the nearest integer percent.
 * - `nextAction` is a short action phrase (e.g. "Configure payers") for
 *   the next incomplete step. When fully launched, it reads "All set".
 */
export function getLaunchProgress(orgState: OrgLaunchState): LaunchProgress {
  const completed = LAUNCH_STEPS.filter((step) => step.isComplete(orgState));
  const firstIncomplete = LAUNCH_STEPS.find((step) => !step.isComplete(orgState));

  const percentComplete = Math.round(
    (completed.length / LAUNCH_STEPS.length) * 100,
  );

  if (!firstIncomplete) {
    return {
      currentStep: null,
      percentComplete: 100,
      nextAction: "All set",
    };
  }

  return {
    currentStep: firstIncomplete.id,
    percentComplete,
    nextAction: firstIncomplete.title,
  };
}

/** Find a step by id; returns undefined if not found. */
export function getLaunchStep(id: string): LaunchStep | undefined {
  return LAUNCH_STEPS.find((step) => step.id === id);
}

/** Return the next step after the given id, or null if already at the end. */
export function getNextStepId(id: LaunchStepId): LaunchStepId | null {
  const idx = LAUNCH_STEPS.findIndex((step) => step.id === id);
  if (idx === -1 || idx === LAUNCH_STEPS.length - 1) return null;
  return LAUNCH_STEPS[idx + 1]!.id;
}

/** Empty state — nothing configured yet. Useful as a seed / test default. */
export const EMPTY_LAUNCH_STATE: OrgLaunchState = {
  hasOrgProfile: false,
  clinicianCount: 0,
  payerCount: 0,
  intakeFormCount: 0,
  billingRuleCount: 0,
  goLiveAt: null,
};
