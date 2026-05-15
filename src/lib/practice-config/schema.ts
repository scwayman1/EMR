import { z } from "zod";

export const practiceConfigSchema = z.object({
  organizationId: z.string().min(1),
  practiceId: z.string().min(1),
  selectedSpecialty: z.string().min(1),
  workflowTemplateIds: z.array(z.string()).min(1),
  chartingTemplateIds: z.array(z.string()).min(1),
  rolePermissionTemplateIds: z.array(z.string()).min(1),
  patientShellTemplateId: z.string().min(1),
  physicianShellTemplateId: z.string().min(1),
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits").optional(),
});

export const draftPracticeConfigSchema = practiceConfigSchema.partial();
