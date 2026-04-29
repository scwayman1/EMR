"use server";

// ---------------------------------------------------------------------------
// EMR-311 — Clinician application server action
// ---------------------------------------------------------------------------
// Validates inbound form data with Zod and records it. V1 keeps applications
// in-memory; future migration adds the `clinician_application` table and
// a review queue surface for the operator console.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { recordApplication } from "@/lib/clinicians";
import type {
  ClinicianApplication,
  ClinicianCredential,
  ClinicianService,
  UsState,
} from "@/lib/clinicians";

const US_STATE_VALUES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

const SERVICE_VALUES = [
  "medical-cannabis-cert",
  "primary-care",
  "psychiatry",
  "pain-management",
  "oncology-supportive",
  "geriatrics",
  "pediatrics-severe-epilepsy",
] as const;

const applicationInput = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  credentials: z.enum(["MD", "DO", "NP", "PA", "DC"]),
  email: z.string().email(),
  phone: z.string().min(7).max(40),
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits"),
  bio: z.string().min(40).max(2000),
  licensedStates: z.array(z.enum(US_STATE_VALUES)).min(1),
  cannabisProgramStates: z.array(z.enum(US_STATE_VALUES)).default([]),
  services: z.array(z.enum(SERVICE_VALUES)).min(1),
  deaSchedule3Plus: z.boolean(),
  acceptsInsurance: z.boolean(),
  insurancePlanNames: z.array(z.string()).default([]),
  cashRateCents: z.number().int().nonnegative(),
});

export type ClinicianApplicationInput = z.infer<typeof applicationInput>;

export interface ApplicationSubmitResult {
  ok: boolean;
  applicationId?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
}

export async function submitClinicianApplication(
  formData: FormData,
): Promise<ApplicationSubmitResult> {
  const raw: Record<string, unknown> = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    credentials: formData.get("credentials"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    npi: formData.get("npi"),
    bio: formData.get("bio"),
    licensedStates: formData.getAll("licensedStates"),
    cannabisProgramStates: formData.getAll("cannabisProgramStates"),
    services: formData.getAll("services"),
    deaSchedule3Plus: formData.get("deaSchedule3Plus") === "on",
    acceptsInsurance: formData.get("acceptsInsurance") === "on",
    insurancePlanNames: formData.getAll("insurancePlanNames"),
    cashRateCents: Number(formData.get("cashRateCents") ?? 0),
  };

  const parsed = applicationInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Some fields need attention.",
    };
  }

  const id = `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const application: ClinicianApplication = {
    id,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    credentials: parsed.data.credentials as ClinicianCredential,
    email: parsed.data.email,
    phone: parsed.data.phone,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    licensedStates: parsed.data.licensedStates as UsState[],
    cannabisProgramStates: parsed.data.cannabisProgramStates as UsState[],
    services: parsed.data.services as ClinicianService[],
    npi: parsed.data.npi,
    deaSchedule3Plus: parsed.data.deaSchedule3Plus,
    bio: parsed.data.bio,
    insurance: {
      acceptsInsurance: parsed.data.acceptsInsurance,
      planNames: parsed.data.insurancePlanNames,
    },
    cashRateCents: parsed.data.cashRateCents,
    status: "submitted",
  };

  recordApplication(application);
  return {
    ok: true,
    applicationId: id,
    message:
      "Application received. We'll verify your license and DEA registration and email you within 3 business days.",
  };
}
