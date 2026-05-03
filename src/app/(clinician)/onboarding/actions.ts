"use server";

// Clinic onboarding wizard — server action.
// Validates the wizard payload with Zod, records the submission, and returns
// either a success summary or per-field errors that re-render in the form.

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { recordSubmission } from "@/lib/clinic-onboarding";
import type {
  ClinicOnboardingSubmission,
  ProviderNpiEntry,
  UsState,
} from "@/lib/clinic-onboarding";

const US_STATE_VALUES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

const NPI_REGEX = /^\d{10}$/;

const providerNpiInput = z.object({
  name: z.string().min(1, "Provider name is required").max(120),
  npi: z.string().regex(NPI_REGEX, "Provider NPI must be 10 digits"),
});

const submissionInput = z.object({
  clinicName: z.string().min(1, "Clinic name is required").max(120),
  legalEntityName: z.string().min(1, "Legal entity name is required").max(160),
  addressLine1: z.string().min(1, "Street address is required").max(160),
  addressLine2: z.string().max(160).optional(),
  addressCity: z.string().min(1, "City is required").max(80),
  addressState: z.enum(US_STATE_VALUES, {
    errorMap: () => ({ message: "Pick a valid US state" }),
  }),
  addressPostalCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "ZIP must be 5 digits or ZIP+4"),
  contactEmail: z.string().email("Enter a valid email"),
  contactPhone: z.string().min(7, "Phone is required").max(40),
  organizationalNpi: z
    .string()
    .regex(NPI_REGEX, "Organizational (Type-2) NPI must be 10 digits"),
  providerNpis: z
    .array(providerNpiInput)
    .min(1, "Add at least one supervising provider NPI")
    .max(20, "Limit 20 providers per submission"),
  stateRegistries: z
    .array(z.enum(US_STATE_VALUES))
    .min(1, "Pick at least one state cannabis registry"),
  notes: z.string().max(2000).optional(),
});

export type ClinicOnboardingInput = z.infer<typeof submissionInput>;

export interface OnboardingSubmitResult {
  ok: boolean;
  submissionId?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
}

export async function submitClinicOnboarding(
  input: unknown,
): Promise<OnboardingSubmitResult> {
  const parsed = submissionInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Some fields need attention.",
    };
  }

  const user = await getCurrentUser();
  const id = `onb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const submission: ClinicOnboardingSubmission = {
    id,
    submittedAt: new Date().toISOString(),
    submittedBy: user?.id ?? null,
    clinicName: parsed.data.clinicName,
    legalEntityName: parsed.data.legalEntityName,
    address: {
      line1: parsed.data.addressLine1,
      line2: parsed.data.addressLine2 || undefined,
      city: parsed.data.addressCity,
      state: parsed.data.addressState as UsState,
      postalCode: parsed.data.addressPostalCode,
    },
    contactEmail: parsed.data.contactEmail,
    contactPhone: parsed.data.contactPhone,
    organizationalNpi: parsed.data.organizationalNpi,
    providerNpis: parsed.data.providerNpis as ProviderNpiEntry[],
    stateRegistries: parsed.data.stateRegistries as UsState[],
    notes: parsed.data.notes || undefined,
  };

  recordSubmission(submission);

  return {
    ok: true,
    submissionId: id,
    message:
      "Clinic onboarding received. Our credentialing team will email you within 3 business days.",
  };
}
