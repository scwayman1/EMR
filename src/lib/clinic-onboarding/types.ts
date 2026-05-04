import type { UsState } from "@/lib/clinicians";

export type { UsState };

export interface ClinicAddress {
  line1: string;
  line2?: string;
  city: string;
  state: UsState;
  postalCode: string;
}

export interface ProviderNpiEntry {
  name: string;
  npi: string;
}

export interface ClinicOnboardingSubmission {
  id: string;
  submittedAt: string;
  submittedBy: string | null;
  clinicName: string;
  legalEntityName: string;
  address: ClinicAddress;
  contactEmail: string;
  contactPhone: string;
  organizationalNpi: string;
  providerNpis: ProviderNpiEntry[];
  stateRegistries: UsState[];
  notes?: string;
}
