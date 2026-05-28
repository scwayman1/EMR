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
import { step11ConfigureMigrationDefinition } from "@/components/onboarding/steps/step-11-configure-migration";
import { Step12PreviewPhysician } from "@/components/onboarding/steps/step-12-preview-physician";
import { Step13PreviewPatient } from "@/components/onboarding/steps/step-13-preview-patient";
import { Step14PreviewPracticeAdmin } from "@/components/onboarding/steps/step-14-preview-practice-admin";
import { step15PublishDefinition } from "@/components/onboarding/steps/step-15-publish";
import type {
  PracticeConfiguration,
  WizardStepDefinition,
  WizardStepId,
} from "./wizard-types";

/** Default reachability: prior step must be complete (or first step). */
/** Default reachability: prior step must be complete and reachable. */
function priorComplete(priorId: WizardStepId | null) {
  return (
    draft: Partial<PracticeConfiguration>,
    completedSteps: Set<WizardStepId>,
  ): boolean => {
    if (priorId === null) return true;
    if (!completedSteps.has(priorId)) return false;

    // Transitively verify that the prior step is also reachable.
    // This prevents bypassing early incomplete steps when downstream
    // steps are trivially/always complete (e.g. step 5, step 6-8 default arrays, etc).
    const priorStep = WIZARD_STEPS.find((step) => step.id === priorId);
    if (!priorStep) return false;

    return priorStep.isReachable(draft, completedSteps);
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
      draft.organizationId !== "pending" &&
      typeof draft.practiceId === "string" &&
      draft.practiceId.length > 0 &&
      draft.practiceId !== "pending",
    isReachable: () => true,
    Component: Step1OrgPractice,
  },
  {
    id: "select-specialty",
    title: "Select specialty",
    description: "Choose the clinical specialty this practice serves.",
    isComplete: (draft) => draft.selectedSpecialty != null,
    isReachable: (draft, completedSteps) =>
      priorComplete("org-and-practice")(draft, completedSteps) &&
      Boolean(draft.organizationId) &&
      draft.organizationId !== "pending" &&
      Boolean(draft.practiceId) &&
      draft.practiceId !== "pending",
    Component: Step2Specialty,
  },
  {
    ...step3CareModelDefinition,
    isReachable: (draft, completedSteps) =>
      priorComplete("select-specialty")(draft, completedSteps) &&
      (step3CareModelDefinition.isReachable ? step3CareModelDefinition.isReachable(draft, completedSteps) : true),
  },
  {
    ...step4EnableModalitiesDefinition,
    isReachable: (draft, completedSteps) =>
      priorComplete("select-care-model")(draft, completedSteps) &&
      (step4EnableModalitiesDefinition.isReachable ? step4EnableModalitiesDefinition.isReachable(draft, completedSteps) : true),
  },
  {
    ...step5DisableModalitiesDefinition,
    isReachable: (draft, completedSteps) =>
      priorComplete("select-care-model")(draft, completedSteps) &&
      (step5DisableModalitiesDefinition.isReachable ? step5DisableModalitiesDefinition.isReachable(draft, completedSteps) : true),
  },
  {
    id: "apply-workflows",
    title: "Apply workflows",
    description:
      "Apply the workflow templates that match the selected care model.",
    isComplete: (draft) => Array.isArray(draft.workflowTemplateIds),
    isReachable: (draft, completedSteps) =>
      priorComplete("disable-modalities")(draft, completedSteps) &&
      completedSteps.has("enable-modalities"),
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
    isReachable: (draft, completedSteps) =>
      priorComplete("apply-roles")(draft, completedSteps) &&
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
      priorComplete("apply-patient-shell")(draft, completedSteps),
    Component: Step10PhysicianShell,
  },
  {
    ...step11ConfigureMigrationDefinition,
    isReachable: (draft, completedSteps) =>
      priorComplete("apply-physician-shell")(draft, completedSteps) &&
      (step11ConfigureMigrationDefinition.isReachable ? step11ConfigureMigrationDefinition.isReachable(draft, completedSteps) : true),
  },
  {
    id: "preview-physician",
    title: "Preview physician",
    description:
      "Walk through the physician experience with the new configuration.",
    Component: Step12PreviewPhysician,
    isComplete: () => true,
    isReachable: priorComplete("configure-migration"),
  },
  {
    id: "preview-patient",
    title: "Preview patient",
    description:
      "Walk through the patient experience with the new configuration.",
    Component: Step13PreviewPatient,
    isComplete: () => true,
    isReachable: priorComplete("preview-physician"),
  },
  {
    id: "preview-practice-admin",
    title: "Preview practice admin",
    description:
      "Walk through the practice admin experience with the new configuration.",
    Component: Step14PreviewPracticeAdmin,
    isComplete: () => true,
    isReachable: priorComplete("preview-patient"),
  },
  {
    ...step15PublishDefinition,
    isReachable: (draft, completedSteps) =>
      priorComplete("preview-practice-admin")(draft, completedSteps),
  },
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
