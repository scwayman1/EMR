// Shared types for per-state cannabis registry integrations.
//
// Each state has its own portal/API. We model a uniform request and result
// shape so the EMR can submit to any state via a single dispatch function.

import { z } from "zod";

export const providerCredentialsSchema = z.object({
  registryId: z.string().optional(),
  npi: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export type ProviderCredentials = z.infer<typeof providerCredentialsSchema>;

export const registrySubmissionSchema = z.object({
  stateCode: z.string().length(2),
  formData: z.record(z.union([z.string(), z.boolean(), z.number()])),
  providerCredentials: providerCredentialsSchema,
});

export type RegistrySubmission = z.infer<typeof registrySubmissionSchema>;

export interface RegistrySubmissionResult {
  success: boolean;
  confirmationNumber?: string;
  registryPatientId?: string;
  expirationDate?: string;
  errors?: string[];
  submittedAt: string;
  /** "electronic" = real/simulated API call; "manual" = paper-based state */
  channel: "electronic" | "manual" | "stub";
}

export type StateRegistrySubmitter = (
  submission: RegistrySubmission,
) => Promise<RegistrySubmissionResult>;
