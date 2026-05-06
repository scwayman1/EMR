import type {
  PracticeConfiguration,
  PracticeConfigurationStatus,
  PracticeConfigurationVersion,
} from "@prisma/client";

export type {
  PracticeConfiguration,
  PracticeConfigurationStatus,
  PracticeConfigurationVersion,
};

export type DraftPracticeConfigurationInput = {
  organizationId: string;
  practiceId: string;
  selectedSpecialty?: string | null;
  /**
   * EMR-431 — Manifest version this draft is anchored to. Populated by
   * apply-specialty (from the resolved manifest) and persisted on publish so
   * the rendered runtime always knows which `(slug, version)` to render
   * against. `null` is acceptable on legacy drafts; the publish handler
   * resolves the latest manifest at publish time when this is unset.
   */
  selectedSpecialtyVersion?: string | null;
  careModel?: string | null;
  enabledModalities?: string[];
  disabledModalities?: string[];
  workflowTemplateIds?: string[];
  chartingTemplateIds?: string[];
  rolePermissionTemplateIds?: string[];
  physicianShellTemplateId?: string | null;
  patientShellTemplateId?: string | null;
  migrationProfileId?: string | null;
  regulatoryFlags?: Record<string, unknown>;
};
