// State Registry API Integration
// Connects state compliance forms to real state medical cannabis registry systems.
// Each state has a different API/portal. This module provides a unified interface
// for the UI; the per-state submission logic lives in
// `src/lib/integrations/state-registries/`.

import { submitToStateRegistry } from "@/lib/integrations/state-registries";

export type RegistryStatus = "connected" | "pending" | "error" | "not_configured";

export interface StateRegistryConfig {
  stateCode: string;
  stateName: string;
  registryName: string;
  registryUrl: string;
  apiEndpoint?: string;
  apiVersion?: string;
  supportsElectronicSubmission: boolean;
  requiresProviderRegistration: boolean;
  renewalPeriodDays: number;
  status: RegistryStatus;
  notes: string;
}

export interface SubmissionResult {
  success: boolean;
  confirmationNumber?: string;
  registryPatientId?: string;
  expirationDate?: string;
  errors?: string[];
  submittedAt: string;
}

// ── State registry configurations ──────────────────────

export const STATE_REGISTRIES: StateRegistryConfig[] = [
  {
    stateCode: "FL",
    stateName: "Florida",
    registryName: "Medical Marijuana Use Registry (MMUR)",
    registryUrl: "https://mmuregistry.flhealth.gov/",
    apiEndpoint: "https://mmuregistry.flhealth.gov/api/v1",
    supportsElectronicSubmission: true,
    requiresProviderRegistration: true,
    renewalPeriodDays: 210,
    status: "not_configured",
    notes: "Requires qualified physician MMUR registration. Orders entered electronically. 70-day supply limit per order.",
  },
  {
    stateCode: "NY",
    stateName: "New York",
    registryName: "Medical Cannabis Program",
    registryUrl: "https://cannabis.ny.gov/medical-cannabis",
    supportsElectronicSubmission: true,
    requiresProviderRegistration: true,
    renewalPeriodDays: 365,
    status: "not_configured",
    notes: "Practitioners must be registered with the NY OCM. Certifications issued through state portal.",
  },
  {
    stateCode: "PA",
    stateName: "Pennsylvania",
    registryName: "Medical Marijuana Program",
    registryUrl: "https://padohmmp.custhelp.com/",
    supportsElectronicSubmission: true,
    requiresProviderRegistration: true,
    renewalPeriodDays: 365,
    status: "not_configured",
    notes: "Practitioners must be registered with PA DOH. Certifications issued through state portal.",
  },
  {
    stateCode: "OH",
    stateName: "Ohio",
    registryName: "Cannabis Therapeutic Recommendation (CTR)",
    registryUrl: "https://www.medicalmarijuana.ohio.gov/",
    supportsElectronicSubmission: true,
    requiresProviderRegistration: true,
    renewalPeriodDays: 365,
    status: "not_configured",
    notes: "Physicians must hold a CTR certificate. Electronic submission through state board portal.",
  },
  {
    stateCode: "IL",
    stateName: "Illinois",
    registryName: "Medical Cannabis Patient Program",
    registryUrl: "https://dph.illinois.gov/topics-services/prevention-wellness/medical-cannabis.html",
    supportsElectronicSubmission: true,
    requiresProviderRegistration: true,
    renewalPeriodDays: 365,
    status: "not_configured",
    notes: "Physician certifications submitted through IDPH portal.",
  },
  {
    stateCode: "MI",
    stateName: "Michigan",
    registryName: "Medical Marihuana Program",
    registryUrl: "https://www.michigan.gov/mra/medical",
    supportsElectronicSubmission: false,
    requiresProviderRegistration: true,
    renewalPeriodDays: 365,
    status: "not_configured",
    notes: "Physician certifications are paper-based. Patient submits to LARA for card. Bona fide relationship required.",
  },
  {
    stateCode: "CO",
    stateName: "Colorado",
    registryName: "Medical Marijuana Registry",
    registryUrl: "https://cdphe.colorado.gov/medical-marijuana-registry",
    supportsElectronicSubmission: false,
    requiresProviderRegistration: false,
    renewalPeriodDays: 365,
    status: "not_configured",
    notes: "No physician registration required. Patient applies to CDPHE with physician certification.",
  },
  {
    stateCode: "CA",
    stateName: "California",
    registryName: "Medical Marijuana ID Card Program",
    registryUrl: "https://www.cdph.ca.gov/Programs/CHSI/Pages/MMICP-Landing.aspx",
    supportsElectronicSubmission: false,
    requiresProviderRegistration: false,
    renewalPeriodDays: 365,
    status: "not_configured",
    notes: "California does not require physician registration. Prop 215 recommendations are physician-issued. Optional MMIC through county health departments.",
  },
];

/**
 * Submit a certification to a state registry. Delegates to the per-state
 * integration module under `src/lib/integrations/state-registries/`.
 */
export async function submitToRegistry(
  stateCode: string,
  formData: Record<string, string | boolean | number>,
  providerCredentials: { registryId?: string; npi?: string; licenseNumber?: string }
): Promise<SubmissionResult> {
  const registry = STATE_REGISTRIES.find((r) => r.stateCode === stateCode);
  if (!registry) {
    return {
      success: false,
      errors: [`No registry configuration for state: ${stateCode}`],
      submittedAt: new Date().toISOString(),
    };
  }

  const result = await submitToStateRegistry({
    stateCode,
    formData,
    providerCredentials,
  });

  return {
    success: result.success,
    confirmationNumber: result.confirmationNumber,
    registryPatientId: result.registryPatientId,
    expirationDate: result.expirationDate,
    errors: result.errors,
    submittedAt: result.submittedAt,
  };
}

export function getRegistryForState(stateCode: string): StateRegistryConfig | undefined {
  return STATE_REGISTRIES.find((r) => r.stateCode === stateCode);
}
