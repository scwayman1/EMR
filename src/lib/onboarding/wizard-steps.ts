// Wizard step registry.
//
// Owns the canonical *order* of the 15 onboarding steps and keeps a
// `WizardStepDefinition` for each slot. Other tickets (EMR-420/421/422/...)
// replace placeholder slots with real step bodies as they ship.
//
// Rules for editing this file:
//  - The order of `WIZARD_STEPS` is the order shown in the rail.
//  - Step IDs must remain stable — they're persisted server-side.
//  - Default `isReachable` requires all *prior* steps to be complete.
//  - Placeholder steps render the `PlaceholderStep` body and are skippable
//    so the shell stays navigable while real steps are still being built.

import { PlaceholderStep } from "@/app/(super-admin)/onboarding/wizard/[draftId]/placeholder-step";
import { Step1OrgPractice } from "@/components/onboarding/steps/step-1-org-practice";
import { Step2Specialty } from "@/components/onboarding/steps/step-2-specialty";
import { step3CareModelDefinition } from "@/components/onboarding/steps/step-3-care-model";
import { step4EnableModalitiesDefinition } from "@/components/onboarding/steps/step-4-enable-modalities";
import { step5DisableModalitiesDefinition } from "@/components/onboarding/steps/step-5-disable-modalities";
import { Step6ApplyWorkflows } from "@/components/onboarding/steps/step-6-apply-workflows";
import { Step7ApplyCharting } from "@/components/onboarding/steps/step-7-apply-charting";
import { Step8ApplyRoles } from "@/components/onboarding/steps/step-8-apply-roles";
import { Step9PatientShell } from "@/components/onboarding/steps/step-9-patient-shell";
import { Step10PhysicianShell } from "@/components/onboarding/steps/step-10-physician-shell";
import type {
  PracticeConfiguration,
  WizardStepDefinition,
  WizardStepId,
} from "./wizard-types";

/** Default reachability: prior step must be complete (or first step). */
function priorComplete(priorId: WizardStepId | null) {
  return (
    _draft: Partial<PracticeConfiguration>,
    completedSteps: Set<WizardStepId>,
  ): boolean => {
    if (priorId === null) return true;
    return completedSteps.has(priorId);
  };
}

/** Build a placeholder step definition for slots not yet implemented. */
function placeholder(
  id: WizardStepId,
  title: string,
  priorId: WizardStepId | null,
  description?: string,
): WizardStepDefinition {
  return {
    id,
    title,
    description,
    // Placeholders never report "complete" on their own — the shell relies on
    // `canSkip` to let the user advance. Other agents will replace these with
    // real `isComplete` functions tied to the draft schema.
    isComplete: () => false,
    isReachable: priorComplete(priorId),
    canSkip: true,
    Component: PlaceholderStep,
  };
}

// ---------------------------------------------------------------------------
// 15 ordered steps. Step IDs and order are load-bearing — do not reorder.
// ---------------------------------------------------------------------------

export const WIZARD_STEPS: WizardStepDefinition[] = [
  {
    id: "org-and-practice",
    title: "Organization & practice",
    description: "Pick an existing org and practice, or create them now.",
    isComplete: (draft) =>
      typeof draft.organizationId === "string" &&
      draft.organizationId.length > 0 &&
      typeof draft.practiceId === "string" &&
      draft.practiceId.length > 0,
    isReachable: () => true,
    Component: Step1OrgPractice,
  },
  {
    id: "select-specialty",
    title: "Select specialty",
    description: "Choose the clinical specialty this practice serves.",
    isComplete: (draft) => draft.selectedSpecialty != null,
    isReachable: (draft) =>
      Boolean(draft.organizationId) && Boolean(draft.practiceId),
    Component: Step2Specialty,
  },
  step3CareModelDefinition,
  step4EnableModalitiesDefinition,
  step5DisableModalitiesDefinition,
  {
    id: "apply-workflows",
    title: "Apply workflows",
    description:
      "Apply the workflow templates that match the selected care model.",
    isComplete: (draft) => Array.isArray(draft.workflowTemplateIds),
    isReachable: priorComplete("disable-modalities"),
    canSkip: true,
    Component: Step6ApplyWorkflows,
  },
  {
    id: "apply-charting",
    title: "Apply charting",
    description: "Apply the charting templates and structured note formats.",
    isComplete: (draft) => Array.isArray(draft.chartingTemplateIds),
    isReachable: priorComplete("apply-workflows"),
    canSkip: true,
    Component: Step7ApplyCharting,
  },
  {
    id: "apply-roles",
    title: "Apply roles",
    description:
      "Apply role definitions and permission groups for this practice.",
    isComplete: (draft) => Array.isArray(draft.rolePermissionTemplateIds),
    isReachable: priorComplete("apply-charting"),
    canSkip: true,
    Component: Step8ApplyRoles,
  },
  {
    id: "apply-patient-shell",
    title: "Apply patient shell",
    description:
      "Pick the patient portal layout — the cards your patients see when they sign in.",
    isComplete: (draft) =>
      typeof draft.patientShellTemplateId === "string" &&
      draft.patientShellTemplateId.length > 0,
    isReachable: (draft) =>
      Array.isArray(draft.rolePermissionTemplateIds) &&
      draft.rolePermissionTemplateIds.length > 0,
    Component: Step9PatientShell,
  },
  {
    id: "apply-physician-shell",
    title: "Apply physician shell",
    description:
      "Pick the Mission Control layout — what your clinicians see when they sign in.",
    isComplete: (draft) =>
      typeof draft.physicianShellTemplateId === "string" &&
      draft.physicianShellTemplateId.length > 0,
    isReachable: (draft, completedSteps) =>
      completedSteps.has("apply-patient-shell"),
    Component: Step10PhysicianShell,
  },
  placeholder(
    "configure-migration",
    "Configure migration",
    "apply-physician-shell",
    "Decide how existing data will migrate into the new configuration.",
  ),
  placeholder(
    "preview-physician",
    "Preview physician",
    "configure-migration",
    "Walk through the physician experience with the new configuration.",
  ),
  placeholder(
    "preview-patient",
    "Preview patient",
    "preview-physician",
    "Walk through the patient experience with the new configuration.",
  ),
  placeholder(
    "preview-practice-admin",
    "Preview practice admin",
    "preview-patient",
    "Walk through the practice admin experience with the new configuration.",
  ),
  placeholder(
    "publish",
    "Publish",
    "preview-practice-admin",
    "Publish this configuration and make it active for the practice.",
  ),
];

/** Lookup helper. */
export function getStepById(
  id: WizardStepId,
): WizardStepDefinition | undefined {
  return WIZARD_STEPS.find((step) => step.id === id);
}

/** Index of a step in the canonical order, or `-1` if not found. */
export function getStepIndex(id: WizardStepId): number {
  return WIZARD_STEPS.findIndex((step) => step.id === id);
}

export const WIZARD_STEP_COUNT = WIZARD_STEPS.length;
