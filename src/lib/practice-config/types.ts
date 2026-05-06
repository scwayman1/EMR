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
